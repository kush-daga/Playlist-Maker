import { type FC } from "react";

const BASE_SPOTIFY_SEARCH_URL = "https://open.spotify.com/search/";
const SongList: FC<{
  songsList: string[];
  playlistUrl?: string;
  playlistId?: string;
}> = ({ songsList, playlistUrl, playlistId }) => {
  return (
    <div className="mx-auto w-4/5 py-10 text-purple-700">
      <button>Create Playlist!</button>

      {playlistUrl && <h2> The Playlist url is - {playlistUrl}</h2>}

      {playlistId && (
        <iframe
          title="Spotify Embed: Recommendation Playlist "
          src={`https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator&theme=0`}
          width="100%"
          height="100%"
          style={{ minHeight: "360px" }}
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
      )}

      <ol>
        {songsList?.map((song) => {
          return (
            <li
              className="list-decimal"
              onClick={() => {
                window.open(
                  encodeURI(BASE_SPOTIFY_SEARCH_URL + song),
                  "_blank"
                );
              }}
              key={song}
            >
              {song}
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default SongList;
