import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import vm from "vm";
import "dotenv/config";
import { GoogleGenAI } from "@google/genai";




const app = express();

const ai = new GoogleGenAI({
  
  apiKey: process.env.GEMINI_API_KEY,
});

const allowedOrigins = [
  "http://localhost:5173",
  "https://code-sync-ai-ten.vercel.app",
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  })
);

app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

const roomCodeMap = new Map();
const roomLanguageMap = new Map();
const roomUsersMap = new Map();
//1
const roomProjectMap=new Map();

function getDefaultProjectFiles(){
  return[
    {
      id:"file-main-js",
      name:"main.js",
      path:"main.js",
      type:"file",
      language:"javascript",
      // content:`//Welcome Here in the Environment\n function greet(name){\n return \`Hello,\${name}!\`;\n

    },


    {
      id:"folder-src",
      name:"src",
      path:"src",
      type:"folder",
    },
    {
      id:"file-src-utils",
      name:"utils.js",
      path:"src/utils.js",
      type:"file",
      language:"javascript",
      content:`export function add(a,b){\n return a+b;\n}\n`,
    },
    {
      id:"file-src-styles",
      name:"styles.css",
      path:"src/styles.css",
      type:"file",
      language:"css",
      content:""
    },
  ];
}


function getOrCreateRoomProjects(roomId){
  if(!roomProjectMap.has(roomId)){
    roomProjectMap.set(roomId,{
      files:getDefaultProjectFiles(),
      activeFiles:new map(),
    });
  }
  return roomProjectMap.get(roomId);
}
//2

app.get("/", (req, res) => {
  res.send("CodeSync AI server is running");
});

// Compiler language aliases


app.post("/run", async (req, res) => {
  const { language, code } = req.body;

  if (!language || !code) {
    return res.status(400).json({
      success: false,
      error: "Language and code are required",
    });
  }

  if (language !== "javascript") {
    return res.json({
      success: true,
      output:
        "Compiler for Java, C++, and Python needs Judge0 API key or self-hosted compiler. JavaScript local runner is working now.",
    });
  }

  try {
    let output = "";

    const sandbox = {
      console: {
        log: (...args) => {
          output += args.map((arg) => JSON.stringify(arg)).join(" ") + "\n";
        },
      },
    };

    vm.createContext(sandbox);

    vm.runInContext(code, sandbox, {
      timeout: 3000,
    });

    res.json({
      success: true,
      output: output || "Code executed successfully. No output.",
    });
  } catch (error) {
    res.json({
      success: true,
      output: error.message,
    });
  }
});


app.post("/ai", async (req, res) => {
  const { code, language, action, question,history=[] } = req.body;

  if (!code || !language || !action) {
    return res.status(400).json({
      success: false,
      error: "Code, language, and action are required",
    });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      success: false,
      error: "Gemini API key is missing in server .env file",
    });
  }

  try {
    const safeHistory=Array.isArray(history)
    ?history.filter(
      (msg)=>
        msg &&
        (msg.role==="user"||msg.role==="assistant")&&
        typeof msg.content==="string"&&
        msg.content.trim()
      
    )
    .slice(-8)
    :[];

    const historyText=
    safeHistory.length>0
    ?`previous converstion in this room session:\n${safeHistory
      .map(
        (msg)=>`${msg.role==="user"?"User":"Assistant"}:${msg.content}`
      )
      .join("\n")}\n\nUse the previous conversation for context if the user asks a follow-up question.\n`
      :"";
    

    const prompt = `
You are an expert AI pair programmer.

The user is working in a collaborative coding room.

Language: ${language}


${historyText}
Action requested: ${action}

User question:
${question || "No custom question provided"}

Code:
\`\`\`${language}
${code}
\`\`\`

Give a clear, beginner-friendly, and practical answer.

Important formatting rules:
- Keep the answer short and useful.
- Use maximum 5 short bullet points.
- Avoid very long explanations unless the user asks.
- Include time and space complexity only when relevant.
- If debugging, mention only the main issue and fix.
- If generating test cases, give maximum 4 test cases.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    res.json({
      success: true,
      result: response.text,
    });
  } catch (error) {
    console.error("AI error:", error.message);

    res.status(500).json({
      success: false,
      error: "Failed to get AI response",
    });
  }
});


io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", ({ roomId, username }) => {
    socket.join(roomId);

    //socket.data.roomId = roomId;
    //socket.data.username = username;

//3
    const safeUsername=username||`User-${socket.id.slice(0,4)}`;
    socket.data.roomId=roomId;
    socket.data.username=safeUsername;
    if(!roomUsersMap.has(roomId)){
      roomUsersMap.set(roomId,new Map());
    }

    if (!roomUsersMap.has(roomId)) {
      roomUsersMap.set(roomId, new Map());
    }
//4
    //roomUsersMap.get(roomId).set(socket.id, username);

    roomUsersMap.get(roomId).set(socket.id, safeUsername);

    const users = Array.from(roomUsersMap.get(roomId).values());

    io.to(roomId).emit("participants-update", users);

    console.log(`${safeUsername} joined room:${roomId}`)

    //console.log(`${username} joined room: ${roomId}`);

    const savedCode = roomCodeMap.get(roomId);

    if (savedCode) {
      socket.emit("load-code", savedCode);
    }

    const savedLanguage = roomLanguageMap.get(roomId);

    if (savedLanguage) {
      socket.emit("load-language", savedLanguage);
    }


    //5
    //tree create

    const project=getOrCreateRoomProject(roomId);
    const defaultFile=project.files.find((f)=>
      f.type==="file"
    );

    project.activeFiles.set(socket.id,{
      socketId:socket.id,
      username:safeUsername,
      filePath:defaultFile?defaultFile.path:"",
    });

    const presence =Array.from(project.activeFiles.values());
    socket.emit("project-init",{
      files:project.files,
      presence,

    });


    io.to(roomId).emit("file-presence-update",presence);


    socket.to(roomId).emit("user-joined", {
      username:safeUsername,
      message: `${safeUsername} joined the room`,
    });
  });
  ///6
  
  socket.on("code-change", ({ roomId, code }) => {
    roomCodeMap.set(roomId, code);
    socket.to(roomId).emit("code-update", code);
  });

  socket.on("language-change", ({ roomId, language, code }) => {
    roomLanguageMap.set(roomId, language);
    roomCodeMap.set(roomId, code);

    socket.to(roomId).emit("language-update", {
      language,
      code,
  });
  });
  //7
  socket.on("file-tree-update",({roomId,files})=>{
    if(!roomId||!Array.isArray(files)) return;
    const project=getOrCreateRoomProject(roomId);
    project.files=files;
    const validFilePaths=new Set(
      files.filter((f)=>f.type==="file").map((f)=>f.path));
    const fallbackPath=files.find((f)=>f.type==="file")?.path||"";

    for(const[sid,info] of project.activeFiles.entries());
    {
      if(info.filePath&&!validFilePaths.has(info.filePath)){
        project.activeFiles.set(sid,{...info,filePath:fallbackPath});



    }
  }

  socket.to(roomId).emit("file-tree-update",{files});
  io.to(roomId).emit(
    "file-presence-update",
    Array.from(project.activeFiles.values()
  ));
});


  socket.on("file-code-change",({roomId,filePath,content})=>{
    if(!roomId||!filePath)return;
    const project=getOrCreateRoomProject(roomId);
    const target=project.files.find(
      (f)=>f.type==="file"&&f.path===filePath
    );
    if(target){
      target.content=content;


  }
  socket.io(roomId).emit("file-code-change",{filePath,content});
});

  
  socket.on("active-file-change",({roomId,filePath})=>{
    if(!roomId)return;
    const project=getOrCreateRoomProjects(roomId);
    project.activeFiles.set(socket.id,{
      socketId:socket.id,
      username:socket.data.username||`User-${socket.id.slice(0,4)}`,
      filePath:filePath||"",
    });
    io.to(roomId).emit(
      "file-presence-update",
      Array.from(project.activeFiles.values())
    );
  }
);


  socket.on("send-message", ({ roomId, message }) => {
    socket.to(roomId).emit("receive-message", message);
  });

  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    const username = socket.data.username;

    if (roomId && roomProjectMap.has(roomId)) {

      const project=roomProjectMap.get(roomId);
      project.activeFiles.delete(socket.id);
      io.to(roomId).emit(
        "file-presence-update",
        Array.from(project.activeFiles.values())
      );

    }

    if(roomId && roomUsersMap.has(roomId)){
      roomUsersMap.get(roomId).delete(socket.id);
      const users=Array.from(roomUsersMap.get(roomId)).values()
      io.to(roomId).emit("participants-update",users);
      

      socket.to(roomId).emit("recieve-message",{
        sender:"System",
        text:`${username} left the room`,
      }
      );
      if(users.length===0){

        roomUsersMap.delete(roomId);
      }
    }
    console.log("User disconnected:",socket.id);

  });
});
//       roomUsersMap.get(roomId).delete(socket.id);

//       const users = Array.from(roomUsersMap.get(roomId).values());

//       io.to(roomId).emit("participants-update", users);

//       socket.to(roomId).emit("receive-message", {
//         sender: "System",
//         text: `${username} left the room`,
//       });

//       if (users.length === 0) {
//         roomUsersMap.delete(roomId);
//       }
//     }

//     console.log("User disconnected:", socket.id);
//   });
// });

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});