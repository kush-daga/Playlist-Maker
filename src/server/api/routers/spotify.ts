import axios, { AxiosError } from "axios";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

type SpotifySongs = {
  spotifyId: string;
  spotifyURI: string;
  spotifyPreviewURL: string | undefined;
  spotifyName: string;
  spotifyHREF: string;
}[];

const delay = async (timeMs: number) => {
  console.log("starting delay");
  return new Promise<void>((res) => {
    setTimeout(() => {
      console.log("completing delay.");
      res();
    }, timeMs);
  });
};

type ResultsResp = {
  tracks: {
    items: Array<{
      id: string;
      uri: string;
      name: string;
      preview_url?: string;
      href: string;
    }>;
  };
};
const fetchMultipleWithIntervals = async (
  songList: string[],
  spotifyToken: string
) => {
  const retryQueue = [];
  const results: ResultsResp[] = [];
  const fetchBaseUrl = `https://api.spotify.com/v1/search?type=track&limit=1&q=`;

  for (let index = 0; index < songList.length; index++) {
    // if (index > 1) break; // For debugging
    if (typeof songList[index] === "undefined") continue;

    await delay(1000);

    const res = await fetch(
      fetchBaseUrl + encodeURIComponent(songList[index] as string),
      {
        headers: {
          Authorization: "Bearer " + spotifyToken,
        },
      }
    );

    if (res.status === 200) {
      const dataRes = (await res.json()) as ResultsResp;
      console.log("receieved data");
      results.push(dataRes);
    } else if (res.status === 429) {
      retryQueue.push(
        fetchBaseUrl + encodeURIComponent(songList[index] as string)
      );
    } else {
      console.log("Some error", await res.json());
    }
  }

  const cleanedTrackUrlsAndIds: SpotifySongs = results
    .map((res) => {
      const trackInfo = res.tracks.items[0];

      console.log("Cleaning details", trackInfo);
      if (trackInfo) {
        return {
          spotifyId: trackInfo.id,
          spotifyURI: trackInfo.uri,
          spotifyPreviewURL: trackInfo.preview_url,
          spotifyName: trackInfo.name,
          spotifyHREF: trackInfo.href,
        };
      } else return null;
    })
    .filter((e) => e !== null) as SpotifySongs;

  console.log("Final Results", cleanedTrackUrlsAndIds);

  return cleanedTrackUrlsAndIds;
};

const createSpotifyPlaylist = async (
  spotifySongs: SpotifySongs,
  spotifyToken: string,
  spotifyUserId: string
) => {
  try {
    const listOfURIs = spotifySongs.map((s) => s.spotifyURI);

    const playlistCreated = await axios.post<{
      id: string;
      external_urls: {
        spotify: string;
      };
    }>(
      `https://api.spotify.com/v1/users/${spotifyUserId}/playlists`,
      {
        name: "Viberrr New Playlist",
        description:
          "This was created by viberrr based on the prompt you gave!",
        public: true,
      },
      {
        headers: {
          Authorization: "Bearer " + spotifyToken,
        },
      }
    );

    const playlistId = playlistCreated.data.id;

    const snapshot_id = await axios.post(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      {
        uris: listOfURIs,
      },
      {
        headers: {
          Authorization: "Bearer " + spotifyToken,
        },
      }
    );

    if (snapshot_id) {
      return {
        url: playlistCreated.data.external_urls.spotify,
        id: playlistCreated.data.id,
      };
    } else {
      return null;
    }
  } catch (e: AxiosError | unknown) {
    if (e instanceof AxiosError)
      console.error("Error Occurred", (e as AxiosError).toJSON());
    throw e;
  }
};

export const spotifyRouter = createTRPCRouter({
  createPlaylist: protectedProcedure
    .input(
      z.object({
        songList: z.array(z.string()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      console.log("TOKEN IS", ctx.session);
      const spotifySongs = await fetchMultipleWithIntervals(
        input.songList,
        ctx.session.accessToken || ""
      );

      const playlist = await createSpotifyPlaylist(
        spotifySongs,
        ctx.session.accessToken || "",
        ctx.session.providerId || ""
      );

      return playlist;
    }),
});
