import {z} from "zod";

const request=z.object({
  prompt:z.string().min(3).max(12000),
  negative:z.string().optional().default(""),
  width:z.number().int().min(256).max(1536).default(768),
  height:z.number().int().min(256).max(1536).default(1024),
  seed:z.number().int().min(0).max(2147483647).default(42)
});

export async function POST(req:Request){
  try{
    const body=request.parse(await req.json());
    const apiKey=process.env.AI_HORDE_API_KEY||"0000000000";
    const submit=await fetch("https://aihorde.net/api/v2/generate/async",{
      method:"POST",
      headers:{"content-type":"application/json","apikey":apiKey,"Client-Agent":"Storybook-Forge:1.0"},
      body:JSON.stringify({
        prompt:body.prompt,
        models:process.env.AI_HORDE_IMAGE_MODELS
          ? process.env.AI_HORDE_IMAGE_MODELS.split(",").map(x=>x.trim()).filter(Boolean)
          : ["AlbedoBase XL"],
        params:{
          width:body.width,
          height:body.height,
          steps:25,
          cfg_scale:7.5,
          seed:body.seed,
          n:1,
          negative_prompt:body.negative,
          sampler_name:"k_euler_a"
        }
      })
    });
    const submitted:any=await submit.json();
    if(!submit.ok || !submitted?.id) throw new Error(submitted?.message||"AI Horde image request failed.");
    const deadline=Date.now()+180000;
    while(Date.now()<deadline){
      await new Promise(r=>setTimeout(r,3500));
      const statusResponse=await fetch("https://aihorde.net/api/v2/generate/status/"+encodeURIComponent(submitted.id),{
        headers:{"apikey":apiKey,"Client-Agent":"Storybook-Forge:1.0"}
      });
      const status:any=await statusResponse.json();
      if(!statusResponse.ok) throw new Error(status?.message||"AI Horde image status request failed.");
      if(status.faulted) throw new Error(status.message||"AI Horde image worker failed.");
      if(status.done){
        const img=status.generations?.[0]?.img;
        if(!img) throw new Error("AI Horde completed without an image.");
        const mime=String(img).startsWith("data:image/")?"": "data:image/webp;base64,";
        return Response.json({image:mime+img,provider:"AI Horde (free, no key)"});
      }
    }
    throw new Error("AI Horde is busy right now. Try again in a moment.");
  }catch(e){
    const message=e instanceof Error?e.message:"Image generation failed";
    console.error("storybook forge image generation error",e);
    return Response.json({error:message},{status:400});
  }
}
