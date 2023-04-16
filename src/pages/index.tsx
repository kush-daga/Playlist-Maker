import { type NextPage } from "next";
import Head from "next/head";
import { signIn, signOut, useSession } from "next-auth/react";

import { api } from "~/utils/api";
import { useState } from "react";
import SongList from "~/components/SongList";

const Home: NextPage = () => {
  const [prompt, setPrompt] = useState(
    "A party where everyone is an Anime fan."
  );
  const [currentVibe, setCurrentVibe] = useState("");

  const [songList, setSongList] = useState<string[]>([]);
  const [allVibes, setAllVibes] = useState<string[]>([]);

  const [playlistData, setPlaylistData] = useState<{
    id: string;
    url: string;
  } | null>(null);

  const { mutateAsync: imagineSongs, isLoading } =
    api.gpt.imagineSongsList.useMutation();

  const { mutateAsync: createPlaylist, isLoading: creatingPlaylist } =
    api.spotify.createPlaylist.useMutation();

  const handleClick = async (e: any) => {
    console.log("TRYING HERE", prompt, allVibes);
    try {
      const data = await imagineSongs({
        prompt,
        vibes: allVibes,
      });

      if (data) {
        console.log("GOT BACK THIS", data);
        const playlistRes = await createPlaylist({ songList: data });
        if (playlistRes)
          setPlaylistData({
            id: playlistRes.id,
            url: playlistRes.url,
          });
        setSongList(data);
      }
    } catch (e) {
      alert("Some Error Occurred");
      console.error("Some Error Occurred", e);
    }
  };

  const loadingState = isLoading && creatingPlaylist;
  return (
    <>
      <Head>
        <title>Viberrr</title>
        <meta
          name="description"
          content="Create your vibe, perfect playlist for house party, or deep work!"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="min-h-screen bg-purple-400">
        <main className="mx-auto flex w-4/5 flex-col items-center gap-4 py-10 text-purple-900">
          <AuthShowcase />
          <br />
          <br />
          <h1 className="text-center text-5xl font-extrabold">
            Create your Vibeeeeee!
          </h1>

          <div className="flex w-full flex-col gap-1 py-12  text-purple-700">
            <label className="my-2 text-xl font-bold">
              Explain the event for which you want to generate the playlist?
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter the prompt!"
              className="min-h-[120px]  w-full  rounded bg-purple-500 p-2 font-semibold text-white placeholder:text-purple-300"
            ></textarea>

            <div className="my-2 mt-8 text-xl font-bold">Enter Vibes</div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                console.log("Submitting");
                setAllVibes((all) => [...all, currentVibe]);
                setCurrentVibe("");
              }}
              className="flex flex-wrap items-center gap-2"
            >
              {allVibes.map((vibe) => (
                <div
                  className="group relative min-w-[84px] cursor-pointer rounded bg-purple-300 p-2 text-center text-sm font-semibold text-purple-700"
                  key={vibe}
                >
                  <div className="absolute -right-2  -top-2 hidden h-4 w-4 items-center justify-center rounded-full bg-purple-500 text-center text-lg group-hover:flex">
                    ❎
                  </div>
                  {vibe}
                </div>
              ))}
              <input
                placeholder="Enter a new vibe!"
                className="rounded bg-purple-600 p-2 text-sm font-semibold text-purple-200 placeholder:font-semibold placeholder:text-purple-200"
                value={currentVibe}
                onChange={(e) => setCurrentVibe(e.target.value)}
              ></input>
            </form>
          </div>
          <button
            disabled={loadingState}
            onClick={(e) => {
              void handleClick(e);
            }}
            className="w-full rounded-md bg-purple-100 p-4"
          >
            {loadingState ? "Please Wait!" : "Get Songs!"}
          </button>
        </main>
        {!loadingState && (
          <SongList
            songsList={songList}
            playlistUrl={playlistData?.url}
            playlistId={playlistData?.id}
          />
        )}
      </div>
    </>
  );
};

export default Home;

const AuthShowcase: React.FC = () => {
  const { data: sessionData } = useSession();

  console.log(sessionData);

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <p className="text-center text-2xl text-white">
        {sessionData && <span>Logged in as {sessionData.user?.name}</span>}
      </p>
      <button
        className="rounded-full bg-white/10 px-10 py-3 font-semibold text-white no-underline transition hover:bg-white/20"
        onClick={sessionData ? () => void signOut() : () => void signIn()}
      >
        {sessionData ? "Sign out" : "Sign in"}
      </button>
    </div>
  );
};
