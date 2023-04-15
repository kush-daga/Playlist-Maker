import { Configuration, OpenAIApi } from "openai";
import { env } from "~/env.mjs";

const configuration = new Configuration({
  apiKey: env.OPENAI_API_KEY,
});

class OpenAIConnection {
  openai: OpenAIApi | null = null;

  constructor() {
    this.createConnection();
  }

  createConnection = () => {
    this.openai = new OpenAIApi(configuration);
    return this.openai;
  };
  getOpenAI = () => {
    if (this.openai) return this.openai;
    return this.createConnection();
  };
}

export default OpenAIConnection;
