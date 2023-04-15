import { type FC } from "react";

const BASE_SPOTIFY_SEARCH_URL = "https://open.spotify.com/search/";
const SongList: FC<{ songsList: string[] }> = ({ songsList }) => {
  return (
    <div className="mx-auto w-4/5 py-10 text-purple-700">
      <h2> The List is </h2>
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
