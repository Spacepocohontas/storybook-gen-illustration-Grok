import {z} from "zod";

export const runtime="nodejs";
export const maxDuration=60;

const request=z.object({url:z.string().url().max(2000)});

const ALLOWED_HOST_RE=/(^|\.)(chub\.ai|characterhub\.ai|spicy-chat\.ai|character\.ai|crushon\.ai|shapes\.inc|rentry\.co|pastebin\.com)$/i;

function isAllowed(url:URL){
  if(!["http:","https:"].includes(url.protocol))return false;
  const host=url.hostname.toLowerCase();
  if(host==="localhost"||host.startsWith("127.")||host.startsWith("10.")||host.startsWith("192.168.")||host==="[::1]")return false;
  return ALLOWED_HOST_RE.test(host);
}

export async function POST(req:Request){
  try{
    const body=request.parse(await req.json());
    const url=new URL(body.url);
    if(!isAllowed(url))return Response.json({error:"That host is not on the allowlist. Paste the raw JSON or a link from Chub AI, SpicyChat, Character.AI, CrushOn.AI, Shapes.inc, TavernAI, Rentry, or Pastebin."},{status:400});
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),20000);
    const r=await fetch(url.toString(),{headers:{"user-agent":"Storybook-Forge/1.0","accept":"application/json,text/plain,*/*"},redirect:"follow",signal:controller.signal});
    clearTimeout(timer);
    if(!r.ok)return Response.json({error:"Remote server returned "+r.status},{status:400});
    const text=await r.text();
    if(text.length>2_000_000)return Response.json({error:"Response too large."},{status:400});
    return Response.json({text,finalUrl:r.url});
  }catch(e){
    const message=e instanceof Error?e.message:"Fetch failed";
    return Response.json({error:message},{status:400});
  }
}
