import input from "postcss/lib/input";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import OpenAIConnection from "~/utils/openai";

const openAiConnection = new OpenAIConnection();

const BASE_PROMPT = `
You are a special spotify playlist generator bot. You love to help curate the mood of an event based on its description.
Please use the prompt given to list songs which would be the most suitable for the event mentioned. It should match the vibes also that are listed down. 
The input would be in the format of one line starting with "EVENT DESCRIPTION-" containing the description of the event and the second line will starting with "VIBES-" having comma seperated list of vibes.

Use this information to give exactly 20 songs in a numeric list format. Don't add any other information other than the list of songs in the output.

`;

const SERVER_INFO = ` You are a bot that helps recommend amazing songs to add in a playlist for any event. You use the prompt and understand the vibe to return 20 best suited songs`;

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
      return finalAns.data.choices[0]?.message?.content;
      // return ["Channel by Frank Ocean", "Hello by Adele"];
    }),
  sampleImagineSongsList: protectedProcedure
    .input(
      z.object({
        prompt: z.string(),
        vibes: z.array(z.string()),
      })
    )
    .mutation(async ({ input }) => {
      const openAi = openAiConnection.getOpenAI();
      console.log("GETTING DATA");
      // const finalAns = await openAi.createChatCompletion({
      //   model: "gpt-3.5-turbo",
      //   messages: [
      //     { role: "system", content: SERVER_INFO },
      //     {
      //       role: "user",
      //       content: createFinalPrompt(input.prompt, input.vibes),
      //     },
      //   ],
      // });
      const respString = `
      Here are a few results.
      1. "Cha-La Head-Cha-La" by Hironobu Kageyama
      2. "History Maker" by Dean Fujioka
      3. "Gurenge" by LiSA
      4. "The Hero!!" by JAM Project
      5. "Cruel Angel's Thesis" by Yoko Takahashi
      6. "We Are!" by Hiroshi Kitadani
      7. "Hacking to the Gate" by Kanako Ito
      8. "Uragiri no Yuuyake" by Theatre Brook
      9. "Unravel" by TK from Ling Tosite Sigure
      10. "Flyers" by Bradio
      11. "Rising Hope" by LiSA
      12. "Dancing in the Velvet Moon" by Nana Mizuki
      13. "Haruka Kanata" by Asian Kung-Fu Generation
      14. "Sign" by FLOW
      15. "The WORLD" by Nightmare
      16. "Tank!" by The Seatbelts
      17. "Redo" by Konomi Suzuki
      18. "Sorairo Days" by Shoko Nakagawa
      19. "Silhouette" by KANA-BOON
      20. "Nandemonaiya" by RADWIMPS
      
      hope u like them
      `;

      const respArray = extractOrderedItems(respString);
      return respArray;
    }),
});
