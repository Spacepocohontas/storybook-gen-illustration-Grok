import {generateText} from "ai";
import {createOpenAI} from "@ai-sdk/openai";
import {z} from "zod";

const request=z.object({
  text:z.string().min(20),
  style:z.string().min(1),
  mode:z.enum(["enhance","storyboard","character_bible","prompt_pack","page_plan"]),
  provider:z.enum(["auto","horde","openrouter","gemini","pollinations","openai","kobold","custom"]).default("auto"),
  customEndpoint:z.string().url().optional(),
  hordeModel:z.string().max(200).optional(),
});

async function generateWithProvider(provider:string,keys:{openai?:string;openrouter?:string;gemini?:string;pollinations?:string;customEndpoint?:string},instructions:string,hordeModel?:string){
  const chosen=provider==="auto"
    ? (process.env.STORYBOOK_DISABLE_HORDE==="true"
        ? (keys.openrouter?"openrouter":keys.gemini?"gemini":keys.pollinations?"pollinations":keys.openai?"openai":process.env.OPENROUTER_API_KEY?"openrouter":process.env.GEMINI_API_KEY?"gemini":process.env.POLLINATIONS_API_KEY?"pollinations":process.env.OPENAI_API_KEY?"openai":"")
        : "horde")
    : provider;

  if(chosen==="horde"){
    const apiKey=process.env.AI_HORDE_API_KEY||"0000000000";
    const submit=await fetch("https://aihorde.net/api/v2/generate/text/async",{
      method:"POST",
      headers:{"content-type":"application/json","apikey":apiKey,"Client-Agent":"Storybook-Forge:1.0"},
      body:JSON.stringify({
        prompt:instructions+"\n\nProcess the manuscript now. Return only the requested production material.",
        models:hordeModel&&hordeModel!=="auto"?[hordeModel]:(process.env.AI_HORDE_TEXT_MODELS?process.env.AI_HORDE_TEXT_MODELS.split(",").map(x=>x.trim()).filter(Boolean):["koboldcpp/Qwen3.5-4B.Q5_K_M"]),
        params:{max_length:4096,max_context_length:16384,temperature:0.4,top_p:0.9}
      })
    });
    const submitted:any=await submit.json();
    if(!submit.ok || !submitted?.id) throw new Error(submitted?.message||"AI Horde text request failed.");
    const deadline=Date.now()+120000;
    while(Date.now()<deadline){
      await new Promise(r=>setTimeout(r,2500));
      const statusResponse=await fetch("https://aihorde.net/api/v2/generate/text/status/"+encodeURIComponent(submitted.id),{
        headers:{"apikey":apiKey,"Client-Agent":"Storybook-Forge:1.0"}
      });
      const status:any=await statusResponse.json();
      if(!statusResponse.ok) throw new Error(status?.message||"AI Horde status request failed.");
      if(status.done){
        const out=status.generations?.map((g:any)=>g.text||"").join("\n").trim()||"";
        if(!out) throw new Error("AI Horde completed without text.");
        return {text:out,provider:"AI Horde (free, no key)"};
      }
      if(status.faulted) throw new Error(status.message||"AI Horde worker failed.");
    }
    throw new Error("AI Horde is busy right now. Try again in a moment.");
  }

  if(chosen==="kobold"){
    if(!keys.customEndpoint) throw new Error("Kobold/Ooba endpoint URL missing.");
    const endpoint=keys.customEndpoint.replace(/\\/$/,"");
    const response=await fetch(endpoint+"/api/v1/generate",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({prompt:instructions+"\\n\\nProcess the manuscript now. Return only the requested production material.",max_length:4096,temperature:0.4,top_p:0.9})
    });
    const data:any=await response.json();
    if(!response.ok) throw new Error(data?.detail||data?.error||"Kobold/Ooba endpoint failed.");
    const text=data?.results?.[0]?.text||"";
    if(!text) throw new Error("Kobold/Ooba endpoint returned no text.");
    return {text,provider:"Kobold/Ooba compatible endpoint"};
  }

  if(chosen==="custom"){
    if(!keys.customEndpoint) throw new Error("Custom endpoint URL missing.");
    const endpoint=keys.customEndpoint.replace(/\\/$/,"");
    const response=await fetch(endpoint.includes("/v1/")?endpoint+"/chat/completions":endpoint+"/v1/chat/completions",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({model:"default",messages:[{role:"system",content:instructions},{role:"user",content:"Process the manuscript now. Return only the requested production material."}],temperature:0.4})
    });
    const data:any=await response.json();
    if(!response.ok) throw new Error(data?.error?.message||"Custom OpenAI-compatible endpoint failed.");
    const text=data?.choices?.[0]?.message?.content||"";
    if(!text) throw new Error("Custom endpoint returned no text.");
    return {text,provider:"Custom OpenAI-compatible endpoint"};
  }

  if(chosen==="openrouter" || chosen==="openai"){
    const key=chosen==="openrouter" ? (keys.openrouter||process.env.OPENROUTER_API_KEY) : (keys.openai||process.env.OPENAI_API_KEY);
    if(!key) throw new Error(chosen==="openrouter" ? "OpenRouter key missing. Create a free OpenRouter key and paste it into the app." : "OpenAI key missing.");
    const client=createOpenAI({
      apiKey:key,
      ...(chosen==="openrouter"?{
        baseURL:"https://openrouter.ai/api/v1",
        headers:{
          "HTTP-Referer":process.env.NEXT_PUBLIC_APP_URL||"https://storybook-gen-illustration.vercel.app",
          "X-Title":"Storybook Forge"
        }
      }: {})
    });
    const model=chosen==="openrouter" ? (process.env.OPENROUTER_MODEL||"openrouter/free") : (process.env.OPENAI_MODEL||"gpt-4.1-mini");
    const result=await generateText({model:client(model),instructions,prompt:"Process the manuscript now. Return only the requested production material.",temperature:0.4});
    return {text:result.text,provider:chosen==="openrouter"?"OpenRouter Free":"OpenAI"};
  }

  if(chosen==="gemini"){
    const key=keys.gemini||process.env.GEMINI_API_KEY;
    if(!key) throw new Error("Gemini key missing. Create a free Gemini API key in Google AI Studio and paste it into the app.");
    const model=process.env.GEMINI_MODEL||"gemini-2.5-flash";
    const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({
        systemInstruction:{parts:[{text:instructions}]},
        contents:[{role:"user",parts:[{text:"Process the manuscript now. Return only the requested production material."}]}],
        generationConfig:{temperature:0.4}
      })
    });
    const data:any=await response.json();
    if(!response.ok) throw new Error(data?.error?.message||"Gemini request failed.");
    const text=data?.candidates?.[0]?.content?.parts?.map((p:any)=>p.text||"").join("")||"";
    return {text,provider:"Google Gemini"};
  }

  if(chosen==="pollinations"){
    const key=keys.pollinations||process.env.POLLINATIONS_API_KEY;
    if(!key) throw new Error("Pollinations key missing. Add a Pollinations key in the app.");
    const client=createOpenAI({apiKey:key,baseURL:"https://gen.pollinations.ai/v1"});
    const model=process.env.POLLINATIONS_MODEL||"openai";
    const result=await generateText({model:client(model),instructions,prompt:"Process the manuscript now. Return only the requested production material.",temperature:0.4});
    return {text:result.text,provider:"Pollinations"};
  }

  throw new Error("No AI provider configured.");
}

function taskInstructions(mode:string){
  switch(mode){
    case "enhance": return "Rewrite the manuscript for clearer prose, stronger pacing, sensory detail and readability while preserving every story fact, character relationship, chronology and important dialogue. Do not add plot events.";
    case "storyboard": return "Break the manuscript into production-ready scenes. For each scene provide a title, source passage summary, setting, characters present, emotional beat, continuity notes and a detailed illustration prompt.";
    case "character_bible": return "Extract only characters supported by the manuscript. For each, list name, role, physical description, clothing, age or era if stated, relationships, recurring visual identifiers and continuity warnings. Mark unknown details as unknown.";
    case "prompt_pack": return "Create one detailed illustration prompt per major scene. Each prompt must be grounded only in the manuscript and must include characters, setting, action, emotion, composition, lighting and the selected visual style.";
    case "page_plan": return "Turn the manuscript into an illustrated-page production plan. For each page/scene provide source text coverage, panel or illustration count, shot type, visual action, dialogue/text placement and image prompt.";
  }
}

export async function POST(req:Request){
  try{
    const body=request.parse(await req.json());
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
${body.text.slice(0,100000)}`;

    const generated=await generateWithProvider(body.provider,{
      openai:req.headers.get("x-openai-api-key")||undefined,
      openrouter:req.headers.get("x-openrouter-api-key")||undefined,
      customEndpoint:body.customEndpoint,
      gemini:req.headers.get("x-gemini-api-key")||undefined,
      pollinations:req.headers.get("x-pollinations-api-key")||undefined
    },instructions,body.hordeModel);

    if(!generated.text) throw new Error("The selected AI provider returned an empty response.");
    return Response.json({result:generated.text,provider:generated.provider});
  }catch(e){
    const message=e instanceof Error?e.message:"Generation failed";
    console.error("storybook forge generation error",e);
    return Response.json({error:message},{status:400});
  }
}
