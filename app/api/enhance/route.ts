import {generateText} from "ai";
import {createOpenAI} from "@ai-sdk/openai";
import {z} from "zod";

const request=z.object({
  text:z.string().min(20),
  style:z.string().min(1),
  mode:z.enum(["enhance","storyboard","character_bible","prompt_pack","page_plan"]),
});

function getModel(){
  if(process.env.OPENROUTER_API_KEY){
    const provider=createOpenAI({
      apiKey:process.env.OPENROUTER_API_KEY,
      baseURL:"https://openrouter.ai/api/v1",
      headers:{
        "HTTP-Referer":process.env.NEXT_PUBLIC_APP_URL || "https://storybook-gen-illustration.vercel.app",
        "X-Title":"Storybook Forge",
      },
    });
    return provider(process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat-v3-0324");
  }
  if(process.env.AI_GATEWAY_API_KEY){
    const provider=createOpenAI({
      apiKey:process.env.AI_GATEWAY_API_KEY,
      baseURL:"https://ai-gateway.vercel.sh/v1",
    });
    return provider(process.env.AI_GATEWAY_MODEL || "openai/gpt-4.1-mini");
  }
  if(process.env.OPENAI_API_KEY){
    const provider=createOpenAI({apiKey:process.env.OPENAI_API_KEY});
    return provider(process.env.OPENAI_MODEL || "gpt-4.1-mini");
  }
  return null;
}

function taskInstructions(mode:string){
  switch(mode){
    case "enhance":
      return "Rewrite the manuscript for clearer prose, stronger pacing, sensory detail and readability while preserving every story fact, character relationship, chronology and important dialogue. Do not add plot events.";
    case "storyboard":
      return "Break the manuscript into production-ready scenes. For each scene provide a title, source passage summary, setting, characters present, emotional beat, continuity notes and a detailed illustration prompt.";
    case "character_bible":
      return "Extract only characters supported by the manuscript. For each, list name, role, physical description, clothing, age or era if stated, relationships, recurring visual identifiers and continuity warnings. Mark unknown details as unknown.";
    case "prompt_pack":
      return "Create one detailed illustration prompt per major scene. Each prompt must be grounded only in the manuscript and must include characters, setting, action, emotion, composition, lighting and the selected visual style.";
    case "page_plan":
      return "Turn the manuscript into an illustrated-page production plan. For each page/scene provide source text coverage, panel or illustration count, shot type, visual action, dialogue/text placement and image prompt.";
  }
}

export async function POST(req:Request){
  try{
    const body=request.parse(await req.json());
    const model=getModel();
    if(!model){
      return Response.json({
        error:"No AI provider is configured. Add OPENROUTER_API_KEY, AI_GATEWAY_API_KEY, or OPENAI_API_KEY in Vercel Environment Variables, then redeploy."
      },{status:503});
    }

    const manuscript=body.text.slice(0,100000);
    const instructions=`You are Storybook Forge, an editorial and visual-development assistant.

CANON RULES:
- The supplied manuscript is the only story canon.
- Never invent names, relationships, events, locations, chronology, physical traits or dialogue.
- If a detail is absent, say "not stated" instead of guessing.
- The selected art style changes visual language only, never story facts.
- Preserve the author's intent and sequence.
- Make output directly usable by a manuscript-to-illustrated-novel production workflow.

SELECTED ART STYLE: ${body.style}
TASK: ${body.mode}
TASK INSTRUCTIONS: ${taskInstructions(body.mode)}

MANUSCRIPT:
${manuscript}`;

    const result=await generateText({
      model,
      instructions,
      prompt:"Process the manuscript now. Return only the requested production material.",
      temperature:0.4,
    });

    return Response.json({
      result:result.text,
      provider:process.env.OPENROUTER_API_KEY?"OpenRouter":process.env.AI_GATEWAY_API_KEY?"Vercel AI Gateway":"OpenAI",
    });
  }catch(e){
    const message=e instanceof Error?e.message:"Generation failed";
    console.error("storybook forge generation error",e);
    return Response.json({error:message},{status:400});
  }
}