import input from "postcss/lib/input";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import OpenAIConnection from "~/utils/openai";

const openAiConnection = new OpenAIConnection();

const BASE_PROMPT = `
You are a special spotify playlist generator bot. You love to help curate the mood of an event based on its description.
Use the prompt given to list songs which would be the most suitable for playing in the event mentioned. It should match the vibes also that are listed down.

Follow some rules
1. Make sure there is a 7:3 ratio of very popular songs worldwide to more niche songs.
2. Do not try to translate the title of the song, if it is in any other language than english. Return the response in original language
3. Double check to make sure the artist and song pair is actually correct, and that it should 99% be available on spotify - This is the most important rule.
4. Add some creativity to the output to help find the best songs to play at the time of the event as described.

The input would be in the format of one line starting with "EVENT DESCRIPTION-" containing the description of the event and the second line will starting with "VIBES-" having comma separated list of vibes that we are looking for in the songs.

Use this information to give exactly 20 songs in a numeric list format. Don't add any other information other than the list of songs in the output.

`;

const SERVER_INFO = `You are aan assistant that helps recommend amazing songs to add in a playlist for any event. You use the prompt and understand the vibe to return 20 best suited songs for that event description and also match it to the vibe given. The most important rule for you is to recommend real and correct songs.`;

const createFinalPrompt = (eventDesc: string, vibes: string[]) => {
  const commaVibes = vibes.join(",");
  const finalPrompt =
    BASE_PROMPT +
    `
    EVENT DESCRIPTION- ${eventDesc.trim().replace("\n", "   ")}
    VIBES- ${commaVibes}
  `;

  return finalPrompt;
};

const extractOrderedItems = (str: string) => {
  const regex = /\d+\.\s(.+)/g; // Regular expression to match ordered items
  const matches = str.match(regex); // Use match() instead of exec()
  console.log("MATCHES", matches);
  return matches
    ? matches.map((match) => match.replace(/^\d+\.\s/, "").trim())
    : []; // Remove the ordered list number and any leading/trailing white space
};

export const gptRouter = createTRPCRouter({
  imagineSongsList: protectedProcedure
    .input(
      z.object({
        prompt: z.string(),
        vibes: z.array(z.string()),
      })
    )
    .mutation(async ({ input }) => {
      const openAi = openAiConnection.getOpenAI();
      console.log("GETTING DATA");
      const finalAns = await openAi.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: SERVER_INFO },
          {
            role: "user",
            content: createFinalPrompt(input.prompt, input.vibes),
          },
        ],
      });
      const respString = finalAns.data.choices[0]?.message?.content as string;
      const respArray = extractOrderedItems(respString);
      return respArray;
      // return ["Channel by Frank Ocean", "Hello by Adele"];
    }),
  // sampleImagineSongsList: protectedProcedure
  //   .input(
  //     z.object({
  //       prompt: z.string(),
  //       vibes: z.array(z.string()),
  //     })
  //   )
  //   .mutation(async ({ input }) => {
  //     const openAi = openAiConnection.getOpenAI();
  //     console.log("GETTING DATA");
  //     // const finalAns = await openAi.createChatCompletion({
  //     //   model: "gpt-3.5-turbo",
  //     //   messages: [
  //     //     { role: "system", content: SERVER_INFO },
  //     //     {
  //     //       role: "user",
  //     //       content: createFinalPrompt(input.prompt, input.vibes),
  //     //     },
  //     //   ],
  //     // });
  //     const respString = `
  //     Here are a few results.
  //     1. "Cha-La Head-Cha-La" by Hironobu Kageyama
  //     2. "History Maker" by Dean Fujioka
  //     3. "Gurenge" by LiSA
  //     4. "The Hero!!" by JAM Project
  //     5. "Cruel Angel's Thesis" by Yoko Takahashi
  //     6. "We Are!" by Hiroshi Kitadani
  //     7. "Hacking to the Gate" by Kanako Ito
  //     8. "Uragiri no Yuuyake" by Theatre Brook
  //     9. "Unravel" by TK from Ling Tosite Sigure
  //     10. "Flyers" by Bradio
  //     11. "Rising Hope" by LiSA
  //     12. "Dancing in the Velvet Moon" by Nana Mizuki
  //     13. "Haruka Kanata" by Asian Kung-Fu Generation
  //     14. "Sign" by FLOW
  //     15. "The WORLD" by Nightmare
  //     16. "Tank!" by The Seatbelts
  //     17. "Redo" by Konomi Suzuki
  //     18. "Sorairo Days" by Shoko Nakagawa
  //     19. "Silhouette" by KANA-BOON
  //     20. "Nandemonaiya" by RADWIMPS

  //     hope u like them
  //     `;

  //     const respArray = extractOrderedItems(respString);
  //     return respArray;
  //   }),
});
