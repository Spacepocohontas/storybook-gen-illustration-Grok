import {generateText} from "ai";
import {createOpenAI} from "@ai-sdk/openai";
import {z} from "zod";

const request=z.object({
  text:z.string().min(20),
  style:z.string().min(1),
  mode:z.enum(["enhance","storyboard","character_bible","prompt_pack","page_plan"]),
  provider:z.enum(["auto","openrouter","gemini","pollinations","openai"]).default("auto"),
});

async function generateWithProvider(provider:string,keys:{openai?:string;openrouter?:string;gemini?:string;pollinations?:string},instructions:string){
  const openaiKey=keys.openai;
  const openrouterKey=keys.openrouter;
  const geminiKey=keys.gemini;
  const pollinationsKey=keys.pollinations;
  const chosen=provider==="auto" ? (openrouterKey?"openrouter":geminiKey?"gemini":pollinationsKey?"pollinations":openaiKey?"openai":process.env.OPENROUTER_API_KEY?"openrouter":process.env.GEMINI_API_KEY?"gemini":process.env.POLLINATIONS_API_KEY?"pollinations":process.env.OPENAI_API_KEY?"openai":"") : provider;
  if(chosen==="openrouter" || chosen==="openai"){
    const key=chosen==="openrouter" ? (openrouterKey||process.env.OPENROUTER_API_KEY) : (openaiKey||process.env.OPENAI_API_KEY);
    if(!key) throw new Error(chosen==="openrouter" ? "OpenRouter key missing. Create a free OpenRouter key and paste it into the app." : "OpenAI key missing.");
    const providerClient=createOpenAI({apiKey:key,...(chosen==="openrouter"?{baseURL:"https://openrouter.ai/api/v1",headers:{"HTTP-Referer":process.env.NEXT_PUBLIC_APP_URL||"https://storybook-gen-illustration.vercel.app","X-Title":"Storybook Forge"}}:{})});
    const model=chosen==="openrouter" ? (process.env.OPENROUTER_MODEL||"openrouter/free") : (process.env.OPENAI_MODEL||"gpt-4.1-mini");
    const result=await generateText({model:providerClient(model),instructions,prompt:"Process the manuscript now. Return only the requested production material.",temperature:0.4});
    return {text:result.text,provider:chosen==="openrouter"?"OpenRouter Free":"OpenAI"};
  }
  if(chosen==="gemini"){
    const key=geminiKey||process.env.GEMINI_API_KEY;
    if(!key) throw new Error("Gemini key missing. Create a free Gemini API key in Google AI Studio and paste it into the app.");
    const model=process.env.GEMINI_MODEL||"gemini-2.5-flash";
    const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({systemInstruction:{parts:[{text:instructions}]},contents:[{role:"user",parts:[{text:"Process the manuscript now. Return only the requested production material."}]}],generationConfig:{temperature:0.4}})});
    const d:any=await r.json(); if(!r.ok) throw new Error(d?.error?.message||"Gemini request failed.");
    return {text:d?.candidates?.[0]?.content?.parts?.map((p:any)=>p.text||"").join("")||"",provider:"Google Gemini"};
  }
  if(chosen==="pollinations"){
    const key=pollinationsKey||process.env.POLLINATIONS_API_KEY;
    if(!key) throw new Error("Pollinations key missing. Add a free Pollinations key in the app.");
    const providerClient=createOpenAI({apiKey:key,baseURL:"https://gen.pollinations.ai/v1"});
    const model=process.env.POLLINATIONS_MODEL||"openai";
    const result=await generateText({model:providerClient(model),instructions,prompt:"Process the manuscript now. Return only the requested production material.",temperature:0.4});
    return {text:result.text,provider:"Pollinations"};
  }
  throw new Error("No AI provider configured. Use OpenRouter Free, Gemini, Pollinations, or OpenAI.");
}
}