import {generateText} from "ai";
import {openai} from "@ai-sdk/openai";
import {z} from "zod";

const request=z.object({text:z.string().min(20),style:z.string(),mode:z.enum(["enhance","storyboard","character_bible","prompt_pack","page_plan"])}); 
export async function POST(req:Request){
 try{
  const body=request.parse(await req.json());
  if(!process.env.OPENAI_API_KEY) return Response.json({error:"AI is not configured on this deployment. Add OPENAI_API_KEY in Vercel project Environment Variables, then redeploy."},{status:503});
  const instructions=`You are Storybook Forge, an editorial and visual-development assistant. Use ONLY the supplied manuscript as canon. Do not invent facts when enhancing; preserve names, relationships, chronology, setting and important dialogue. The selected art style controls visual language, not story facts. Return useful production-ready material.\nART STYLE: ${body.style}\nTASK: ${body.mode}\nMANUSCRIPT:\n${body.text.slice(0,60000)}`;
  const {text}=await generateText({model:openai("gpt-4.1-mini"),instructions,prompt:"Analyze the manuscript and produce the requested result. For enhancement, improve prose clarity, pacing and imagery while preserving the author's meaning and events."});
  return Response.json({result:text});
 }catch(e){return Response.json({error:e instanceof Error?e.message:"Generation failed"},{status:400})}
}