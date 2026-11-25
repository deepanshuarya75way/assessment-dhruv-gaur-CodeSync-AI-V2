import { data, Link,useNavigate, useParams } from "react-router";
import { useEffect, useMemo,useRef, useState } from "react";
import Editor from "@monaco-editor/react";

import ReactMarkdown from "react-markdown";
import JSZip from "jszip";
import { socket } from "../socket";
import toast from "react-hot-toast";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

import {
  Folder,
  FileCode,
  Plus,
  FolderPlus,
  Pencil,
  Trash2,
  Download,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Send,
  Sparkles,
  Copy,
  LogOut,
  X,
  Files,}from "lucide-react";

  const AVATAR_COLORS=[
    "bg-amber-400 text-slate-950",
"bg-emerland-400 text-slate-950",
"bg-sky-400 text-slate-950",
"bg-pink-400 text-slate-950",
"bg-violet-400 text-slate-950",  ];


function getLanguageFromPath(filePath){
  const ext=filePath.split(".").pop()?.toLowerCase();
  const map={
    js:"javascript",
    jsx:"javascript",
    ts:"typescript",
    tsx:"typescript",
    py:"python",
    java:"java",
    c:"c",
    css:"css",
    html:"html",
    json:"json",
    md:"markdown",
  };
  return map[ext]||"plaintext";
}

function getAvatarColor(name=""){
  let hash=0;
  for(let i=0;i<name.length;i++){
  hash=name.charCodeAt(i)+((hash<<5)-hash);
  }
  return AVATAR_COLORS[Math.abs(hash)%AVATAR_COLORS.length];
}

function CodeRoom(){
  const {roomId}=useParams();
  const navigate=useNavigate();
  const username=useMemo(
    ()=>localStorage.getItem("codesync_username")||"Guest",[]
  );
  

const[projectFiles,setProjectFiles]=useState([]);
const[openTabs,setOpenTabs]=useState([]);
const[activeFilePath,setActiveFilePath]=useState("");
const[isExplorerOpen,setIsExplorerOpen]=useState(true);
const[filePresence,setFilePresence]=useState([]);


const[participants,setParticipants]=useState([]);
const[output,setOutput]=useState("");
const[isRunning,setIsRunning]=useState(false);


const[rightTab,setRightTab]=useState("ai");
const[messages,setMessages]=useState([]);
const[chatInput,setChatInput]=useState("");

const[aiQuestion,setAiQuestion]=useState("");
const[aiResponse,setAiResponse]=useState("ask ai to explain,debug,optimize,test cases for your cde");


const[aiHistory,setAiHistory]=useState([]);
const[isAiLoading,setIsAiLoading]=useState(false);


const activeFile=useMemo(
  ()=>
    projectFiles.find((f)=>f.type==="file"&&f.path===activeFilePath),
  [projectFiles,activeFilepath]
);

const sortedProjectFiles=useMemo(()=>{
  return [...projectFiles].sort((a,b)=>{
    const aParts=a.path.split("/");
    const bParts=b.path.split("/");
    const minLen=Math.min(aParts.length,bParts.lengt);
    for(let i=0;i<minLen-1;i++){
      if(aParts[i]!==bParts[i])return aParts[i].localeCompare(bParts[i]);

    }

    if(aParts.length!==bParts.length)return a.path.localeCompare(b.path);
    if(a.type!=b.type)return a.type==="folder"?-1:1;
    return a.path.localeCompare(b.path);
  });
  
},[projectFiles]);


  useEffect(()=>{
    setAiHistory([]);
    setAiQuestion("");
    setAiResponse(
      "Ask AI to explain ,debug ,optimize,or generate test cases for your code."
    );

  },[roomId]);

const clearAiConversation=()=>{
  setAiHistory([]);
  setAiHistory("");
  setAiResponse(
    "Ask AI to explain,debug,optimize,or generate test cases for your code."

  );
  toast.success("AI coversation cleared");
};


useEffect(() => {
  if(!roomId)return;
    socket.connect();
    socket.emit("join-room",{roomId,username});

  const onParticipantsUpadte=(users)=>{
    setParticipants(users||[]);

  };

  const onUserJoined=({message})=>{
    toast.success(message);
    setMessages((prev)=>[...prev,{sender:"System",text:"message"}]);

  };

  const onRecieveMessage=(msg)=>{
    setMessages((prev)=>
      [...prev,msg]);
    };
  

  const OnProjectInit=({files,presence})=>{
    const list=files||[];
    setProjectFiles(list);
    setFilePresence(presence||[]);
    const firstFile=list.find((f)=>
      f.type==="file"
    );
    if(firstFile){
      setActiveFilePath(firstFile.path);
      setOpenTabs([firstFile.path]);
    }
  };

  const onFileTreeUpdate=({files})=>{
    const list=files||[];
    setProjectFiles(list);
    const validPaths=new Set(
      list.filter((f)=>f.type==="file").map((f)=>f.path)
    );

    setOpenTabs((prev)=>prev.filter((p)=>validPaths.has(p)));
    setActiveFilePath((prev)=>{
      if(validPaths.has(prev))return prev;
      return list.find((f)=>f.type==="file")?.path||"";

  });
  };


  const onFileCodeChange=({filePath,content})=>{
    setProjectFiles((prev)=>{
      prev.map((item)=>
      item.type==="file"&&item.path===filePath?{...item,content}:item)
    });
  };

  const onFilePresenceUpdate=(presenceList)=>{
    setFilePresence(presenceList||[]);
  }


    socket.on("participants-update", onParticipantsUpadte);
    socket.emit("join-room", {
      roomId,
      username: usernameRef.current,
    });
    socket.on("project-init",onProjectInit);

    socket.on("file-tree-update",onFileTreeUpdate);
    socket.on("file-code-change",onFileCodeChange);
    socket.on("file-presence-update",onFilePresenceUpdate);

    socket.on("load-code", (savedCode) => {
      setCode(savedCode);
    });
    socket.on("load-language", (savedLanguage) => {
  setSelectedLanguage(savedLanguage);
});

    socket.on("code-update", (updatedCode) => {
      setCode(updatedCode);
    });
socket.on("language-update", ({ language, code }) => {
  setSelectedLanguage(language);
  setCode(code);
  setOutput(`Ready to run ${LANGUAGES[language].label} code...`);
});
    socket.on("receive-message", onRecieveMessage);

    socket.on("user-joined", onUserJoined);

    return () => {

      socket.off("participants-update",onParticipantsUpadte);
      socket.off("user-joined",onUserJoined);
      
      socket.off("recieve-message",onRecieveMessage);

      socket.off("project-init",onProjectInit);


      socket.off("file-tree-update",onFileTreeUpdate);

      socket.off("file-code-change",onFileCodeChange);
      socket.off("file-presence-update",onFilePresenceUpdate);
      
      socket.off("load-code");
      socket.off("load-language");
      socket.off("code-update");
      socket.off("language-update");
      socket.off("receive-message");
      socket.off("user-joined");
      socket.off("participants-update");
      socket.disconnect();
    };
  }, [roomId,username]);


}

const handleOpenFile=(filePath)=>{
  setOpenTabs((prev)=>(prev.includes(filePath)?prev:[...prev,filePath]));
  setActiveFilePath(filePath);
  socket.emit("activ-file-change",{roomId,filePath});
};

const handleClosetab=(e,filepath)=>{
  e.stopPropogation();
  const remaining=openTabs.filter((p)=>p!==filePath);
  setOpentabs(reminaing);
  if(activeFilePath===filePath){
    const nextActive=remaining[remaining.length-1]||"";
    setActiveFilePath(nextActive);
    scoket.emit("active-file-change",{roomId,filePath:nextActive});
  }
};


const handleCreateItems=(type)=>{
  const raw=window.prompt(
    type==="folder"?"Enter foldeer path":"Enter file Path"
  );
  if(!raw||!raw.trim())return;

  const cleanPath=raw.trim().replace(/^\+|\/+$/g,"");
  if(!cleanPath)return;

  if(projectFiles.some((f)=>f.path===cleanPath)){
    toast.error("Fileor Folder already exist");
    return;
  }

  const updated=[...projectFiles];
  const parts=cleanPath.split("/");
  for(let i=1;i<parts.length;i++){
    const parentPath=parts.slice(0,i).join("/");
    if(!updated.some((f)=>f.path===parentPath)){
      updated.push({
        id:`fld-${Date.now()}-${i}`,
        name:parts[i-1],
        path:parentPath,
        type:"folder",

      });
    }
  }
  if(type==="folder"){
    updated.push({
      id:`fld-${Date.now()}`,
      name:parts[parts.length-1],
      path:cleanPath,
      type:"folder",

    });
  }
  else{
    updated.push({
      id:`fld-${Date.now()}`,
      name:parts[parts.length-1],
      path:cleanPath,
      type:"file",
      language:getLanguageFromPath(cleanPath),
      content:"",

    });
  }
setProjectFiles(updated);
socket.emit("file-tree-update",{roomId,files:updated});
if(type==="file"){
  handleOpenFile(cleanPath);

}
toast.success(`${type==="folder"?"Folder":"File"}cretaed`);



};



const handleRenameItem=(e,item)=>{
  e.stopPropogation();
  const nextName=window.prompt("Rename to:",item.name);
  if(!nextName||!nextName.trim()||nextName.trim()===item.name)return;
  const trimmed=nextName.trim().replace(/^\+|\/+$/g,"");
  const parentPrefix=item.path.includes("/")?
  item.path.slice(0,item.path.lastIndexOf("/")+1):"";

  const nextPath=`${parentPrefix}${trimmed}`;
  if(projectFiles.some((f)=>f.path===nextPath)){
    toast.error("Name already exist");
    return;
  }
  const updated=projectFiles.map((entry)=>{
    if(entry.path===item.path){
      return{
        ...entry,name:trimmed,path:nextPath,
        ...(entry.type==="file"?{
          language:getLanguageFromPath(nextPath)
        }:{}),
      };
    }
    if(item.type==="folder"&& entry.path.startsWith(`${item.path}/`)){
      const childPath=entry.path.replace(`${item.path}/`,`${nextPath}/`);
      return {
        ...entry,
        path:childPath,
        name:childPath.split("/").pop(),
      };
    }
    return energy;
  });

  setProjectFiles(updated);
  setOpenTabs((prev)=>
  prev.map((p)=>{
    if(p===item.path)return nextPath;
    if(item.type==="folder"&&p.startsWith(`${item.path}/`)){
      return p.replace(`${item.path}/`,`${nextPath}/`);
    }
    return p;
  }));
  if(activeFilePath===item.path||(item.type==="folder"&&activeFilePath.startsWith(`${item.path}/`))
  ){

  const updateActive=activeFilePath===item.path?
  nextPath
  :activeFilePath.replace(`${item.path}/`,`${nextPath}/`);
  setActiveFilePath(updatedActive);
  socket.emit("active-file-change",{roomId,filePath:updatedActive});

  }
  socket.emit("file-tree-update",{roomId,files:updated});
  toast.success("Renamed succesfullly");



};



const handleDeleteItem=(e,item)=>{
  e.stopPropogation();
  const ok=window.confirm(`Delete:"${item.path}"?`);
  if(!ok)return;
  const updated=projectFiles.filter(
    (entry)=>entry.path!==item.path&&!entry.path.startsWith(`${item.path}/`)
  );
setProjectFiles(updated);
setOpenTabs((prev)=>prev.filter((p)=>p!==item.path&&!p.startsWith(`${item.path}/`)));

if(
  activeFilepath===itempath||
  activeFilePath.startsWith(`${item.path}/`)
  
){
  const fallback=updated.find((f)=>f.type==="file")?.path||"";
  setActiveFilePath(fallback);
  socket.emit("active-file-change",{roomId,filePath:fallback});
  
}
socket.emit("file-tree-update",{roomId,files:updated});
toast.success("Deleted");



};


const handleCodeChange = (newvalue) => {
    const content=newValue??"";
    if(!activeFilepath)return;
    setProjectFiles((prev)=>
      prev.map((item)=>itme.type==="file"&&item.path===activeFilepath?{...item,content}:item));

      socket.emit("file-code-change",{
        roomId,
        filePath:activeFilePath,

        content,

      }
      );
    };

    const handleRunCode=async()=>{
      if(!activeFile){
        toast.error("Select afile to run");
        return;

    }
    setIsRunning(true);
    setOutput("Running...");
    try{
      const res=await fetch(`${BACKEND_URL}/run`,{
        method:"POST",
        headers:{"Content-type":"application/json"},
        body:JSON.stringify({language:activeFile.language||"javascript",
          code:activeFile.content||"",
        }),
      });

      const data=await res.json();
      setOutput(data.Output||data.error||"No output");
    }

    catch{
      setOutput("Failed to run code.check serve rconnection");

    }
    finally{
      setIsRunning(false);
    }};




const askAI = async (action) => {


    if(!activeFile){
      toast.error("Open a file first");
      return;
    }
    const trimmedQuestion=aiQuestion.trim();
    const userMessage=trimmedQuestion
    ?`${action}:${trimmedQuestion}`
    :action;

    setIsAiLoading(true);
    setAiResponse("AI is thinking...");
    toast.loading("AI is thinking ... ",{id:"ai-action"});
    try {
    const response = await fetch(`${BACKEND_URL}/ai`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code:activeFile.content||"",
        language: activeFile.language||"javascript",
        action,
        question: trimmedQuestion,
         history:aiHistory,
      }),
    });
    const data=await response.json();


    if(data.success){
      setAiResponse(data.result);

      setAiHistory((prev)=>
        [
        ...prev,
        {role:"user",content:userMessage},
        {role:"assistant",content:data.result},

      ].slice(-8)
    );
    setAiQuestion("");
    toast.success("AI response ready",{id:"ai-action"});
  }else{
      setAiResponse(data.error||"Something went wrong");
      toast.error("AI failed",{id:"ai-action"});
    }
    }
    catch(error){
      setAiResponse("Server error.Make sure.Backend is running.");
      toast.error("Server error",{id:"ai-action"});

    }finally{
      setIsAiLoading(false);
    }
  }

  
const handSendMessage=(e)=>{
  e.preventDefault();
  if(!chatInput.trim())return;
  const msg={sender:username,text:chatInput.trim()};
  setMessages((prev)=>[...prev,msg]);
  socket.emit("send-message",{roomId,message:msg});
  setChatInput("");

};


const copyRoomId = async () => {
  navigator.clipboard.writeText(roomId);
  toast.success("Room ID copied");
};

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-950">
      <nav className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div>
          <h1 className="text-xl font-black">CodeSync AI Room</h1>
          <p className="text-sm font-medium text-slate-500">
            Room ID: <span className="text-blue-600">{roomId}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={copyRoomId}
            className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
          >
            Copy Room Link
          </button>

          <Link
            to="/rooms"
            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white"
          >
            Exit
          </Link>
        </div>
      </nav>

      <main className="grid min-h-[calc(100vh-73px)] grid-cols-1 gap-4 p-4 lg:grid-cols-[260px_1fr_340px]">
        <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-4 text-xs font-black uppercase tracking-widest text-slate-400">
            Workspace
          </p>

          <RoomMenu
  active
  text={currentLanguage.file}
  onClick={() => scrollToSection(editorRef, "Editor opened")}
/>

<RoomMenu
  text="output"
  onClick={() => scrollToSection(outputRef, "Output opened")}
/>

<RoomMenu
  text="team-chat"
  onClick={() => scrollToSection(chatRef, "Team chat opened")}
/>

<RoomMenu
  text="ai-assistant"
  onClick={() => scrollToSection(aiRef, "AI assistant opened")}
/>

          <div className="mt-8 rounded-3xl border border-blue-100 bg-blue-50 p-5">
            <h3 className="font-black text-blue-700">Live Room</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Socket.IO connected. Code changes sync live inside this room.
            </p>
          </div>

          <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
  <div className="flex items-center justify-between">
    <h3 className="font-black text-slate-900">Participants</h3>

    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
      {participants.length} online
    </span>
  </div>

  <div className="mt-4 space-y-3">
    {participants.map((user, index) => (
      <User
        key={index}
        name={user}
        role={user === usernameRef.current ? "You" : "Collaborator"}
      />
    ))}

    <User name="AI Bot" role="Assistant" />
  </div>
</div>
        </aside>

        <section
  ref={editorRef}
  className="flex flex-col rounded-3xl border border-slate-200 bg-white shadow-sm"
>
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-black text-slate-950">
                {currentLanguage.file}
              </h2>
              <p className="text-sm text-slate-500">
                {currentLanguage.label} editor
              </p>
            </div>

           <div className="flex flex-col gap-3 sm:flex-row">
  <select
    value={selectedLanguage}
    onChange={handleLanguageChange}
    className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-blue-500"
  >
    <option value="javascript">JavaScript</option>
    <option value="java">Java</option>
    <option value="cpp">C++</option>
    <option value="python">Python</option>
  </select>

  <button
    onClick={copyCode}
    className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
  >
    Copy Code
  </button>

  <button
    onClick={downloadCode}
    className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
  >
    Download
  </button>

  <button
    onClick={runCode}
    disabled={isRunning}
    className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
  >
    {isRunning ? "Running..." : "Run Code"}
  </button>
</div>
          </div>

          <div className="min-h-[520px] flex-1 overflow-hidden bg-slate-950">
            <Editor
              height="520px"
              language={selectedLanguage}
              value={code}
              theme="vs-dark"
              onChange={handleCodeChange}
              options={{
                fontSize: 14,
                fontFamily: "Fira Code, Consolas, monospace",
                minimap: {
                  enabled: false,
                },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: "on",
                padding: {
                  top: 18,
                },
              }}
            />
          </div>

          <div ref={outputRef} className="border-t border-slate-200 bg-slate-50 p-5">
  <div className="flex items-center justify-between">
    <h3 className="font-black text-slate-950">Output</h3>

    {isRunning && (
      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">
        Running...
      </span>
    )}
  </div>

  <div className="mt-3 min-h-[70px] rounded-2xl bg-white p-4 font-mono text-sm text-green-700 shadow-sm whitespace-pre-wrap">
    {output}
  </div>
</div>
        </section>

        <aside className="grid gap-4">
        <div
  ref={aiRef}
  className="rounded-3xl border border-indigo-100 bg-indigo-50 p-5 shadow-sm"
>
  <div className="flex items-center justify-between gap-2">
    <h3 className="text-lg font-black text-indigo-700">
    AI Pair Programmer
    </h3>
    <button onClick={clearAiConversation}
    disabled={aiHistory.lenth===0||isAiLoading}
    className="rounded-full border-indigo-200 bg-white px-3 py-1 test-xs font-bold text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50">
      Clear
    </button >
  </div>
  

  <p className="mt-3 text-sm leading-relaxed text-slate-600">
    Ask AI to explain your logic, debug errors, optimize code, or generate test
    cases.
  </p>

  <div className="mt-5 grid grid-cols-2 gap-3">
    <button
      onClick={() => askAI("Explain this code")}
      disabled={isAiLoading}
      className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-indigo-700 shadow-sm hover:bg-indigo-100 disabled:opacity-60"
    >
      Explain
    </button>

    <button
      onClick={() => askAI("Debug this code")}
      disabled={isAiLoading}
      className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-indigo-700 shadow-sm hover:bg-indigo-100 disabled:opacity-60"
    >
      Debug
    </button>

    <button
      onClick={() => askAI("Optimize this code")}
      disabled={isAiLoading}
      className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-indigo-700 shadow-sm hover:bg-indigo-100 disabled:opacity-60"
    >
      Optimize
    </button>

    <button
      onClick={() => askAI("Generate test cases")}
      disabled={isAiLoading}
      className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-indigo-700 shadow-sm hover:bg-indigo-100 disabled:opacity-60"
    >
      Test Cases
    </button>
  </div>

  <textarea
    value={aiQuestion}
    onChange={(e) => setAiQuestion(e.target.value)}
    placeholder="Ask custom question..."
    className="mt-4 min-h-[80px] w-full resize-none rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-indigo-500"
  />

  <button
    onClick={() => askAI("Answer custom question")}
    disabled={isAiLoading}
    className="mt-3 w-full rounded-2xl bg-indigo-600 px-5 py-3 font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
  >
    {isAiLoading ? "Thinking..." : "Ask AI"}
  </button>

 <div className="mt-5 max-h-[280px] space-y overflow-y-auto rounded-2xl bg-white p-4 text-sm leading-relaxed text-slate-700 shadow-sm">
  {aiHistory.length===0?(
    <ReactMarkdown>{aiResponse}</ReactMarkdown>
  ):(
    <>
    {aiHistory.map((item,index)=>(
      <div
      key={index}
      className={`rounded-xl p-3 ${
        item.role==="user"
        ?"bg-indigo-50 text-indigo-950"
        :"bg-slate-50 text-slate-700"
      }`}
      >
        <p className="mb-1 text-xs font-black uppercase tracking-wide text-slate-500">
          {item.role==="user"?"You":"AI"}
        </p>
        
   



  <ReactMarkdown
    components={{
      h1: ({ children }) => (
        <h1 className="mb-3 text-lg font-black text-slate-950">{children}</h1>
      ),
      h2: ({ children }) => (
        <h2 className="mb-3 text-base font-black text-slate-950">{children}</h2>
      ),
      h3: ({ children }) => (
        <h3 className="mb-2 text-sm font-black text-indigo-700">{children}</h3>
      ),
      p: ({ children }) => (
        <p className="mb-3 leading-relaxed text-slate-700">{children}</p>
      ),
      ul: ({ children }) => (
        <ul className="mb-3 list-disc space-y-1 pl-5">{children}</ul>
      ),
      ol: ({ children }) => (
        <ol className="mb-3 list-decimal space-y-1 pl-5">{children}</ol>
      ),
      li: ({ children }) => <li className="text-slate-700">{children}</li>,
      code: ({ children }) => (
        <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-900">
          {children}
        </code>
      ),
      pre: ({ children }) => (
        <pre className="mb-3 overflow-x-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">
          {children}
        </pre>
      ),
    }}
  >
    {item.content}
    {/* {aiResponse} */}
  </ReactMarkdown>
</div>
    ))}
    {isAiLoading&&(
      <p className="text-xs font-semibold text-indigo-600">
        AI is thinking...
      </p>
    )}
    </>
  )}
  </div>
</div>
    


          <div
  ref={chatRef}
  className="flex min-h-[420px] flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
>
            <h3 className="text-lg font-black text-slate-950">Team Chat</h3>

            <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className="rounded-2xl bg-slate-50 p-3 text-sm"
                >
                  <p className="font-black text-slate-900">{msg.sender}</p>
                  <p className="mt-1 text-slate-600">{msg.text}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendMessage();
                }}
                placeholder="Type message..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white"
              />

              <button
                onClick={sendMessage}
                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white"
              >
                Send
              </button>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );


const LANGUAGES = {
  javascript: {
    id: "javascript",
    label: "JavaScript",
    file: "main.js",
  },
  java: {
    id: "java",
    label: "Java",
    file: "Main.java",
  },
  cpp: {
    id: "cpp",
    label: "C++",
    file: "main.cpp",
  },
  python: {
    id: "python",
    label: "Python",
    file: "main.py",
  },
};

const CODE_SNIPPETS = {
  javascript: `function twoSum(nums, target) {
  const map = new Map();

  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];

    if (map.has(need)) {
      return [map.get(need), i];
    }

    map.set(nums[i], i);
  }
}`,

  java: `import java.util.*;

class Main {
    public static int[] twoSum(int[] nums, int target) {
        HashMap<Integer, Integer> map = new HashMap<>();

        for (int i = 0; i < nums.length; i++) {
            int need = target - nums[i];

            if (map.containsKey(need)) {
                return new int[]{map.get(need), i};
            }

            map.put(nums[i], i);
        }

        return new int[]{};
    }

    public static void main(String[] args) {
        int[] nums = {2, 7, 11, 15};
        int target = 9;

        System.out.println(Arrays.toString(twoSum(nums, target)));
    }
}`,

  cpp: `#include <bits/stdc++.h>
using namespace std;

vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int, int> mp;

    for (int i = 0; i < nums.size(); i++) {
        int need = target - nums[i];

        if (mp.find(need) != mp.end()) {
            return {mp[need], i};
        }

        mp[nums[i]] = i;
    }

    return {};
}

int main() {
    vector<int> nums = {2, 7, 11, 15};
    int target = 9;

    vector<int> ans = twoSum(nums, target);
    cout << ans[0] << " " << ans[1];

    return 0;
}`,

  python: `def two_sum(nums, target):
    mp = {}

    for i, num in enumerate(nums):
        need = target - num

        if need in mp:
            return [mp[need], i]

        mp[num] = i

    return []


nums = [2, 7, 11, 15]
target = 9

print(two_sum(nums, target))`,
};

// function CodeRoom() {
//   const [aiQuestion, setAiQuestion] = useState("");
// const [aiResponse, setAiResponse] = useState(
//   "Ask AI to explain, debug, optimize, or generate test cases for your code."
// );
// const[aiHistory,setAiHistory]=useState([]);

// const [isAiLoading, setIsAiLoading] = useState(false);
//   const { roomId } = useParams();
//   const [output, setOutput] = useState("Ready to run JavaScript code...");
//   const [isRunning, setIsRunning] = useState(false);
// const outputRef = useRef(null);
// const editorRef = useRef(null);
// const chatRef = useRef(null);
// const aiRef = useRef(null);


// const clearAiConversation=()=>{
//   setAiHistory([]);
//   setAiHistory("");
//   setAiResponse(
//     "Ask AI to explain,debug,optimize,or generate test cases for your code."

//   );
//   toast.success("AI coversation cleared");
// };


// const scrollToSection = (ref, message) => {
//   ref.current?.scrollIntoView({
//     behavior: "smooth",
//     block: "center",
//   });

//   toast.success(message);
// };

//   const usernameRef = useRef(
//   localStorage.getItem("codesync_username") ||
//     "Guest-" + Math.random().toString(36).substring(2, 6)
// );

//   const [selectedLanguage, setSelectedLanguage] = useState("javascript");
//   const [code, setCode] = useState(CODE_SNIPPETS.javascript);
 

//   const [messages, setMessages] = useState([
//     {
//       sender: "System",
//       text: "Welcome to your coding room.",
//     },
//     {
//       sender: "AI",
//       text: "Ask me to debug, explain, or optimize your code.",
//     },
//   ]);

//   const [chatInput, setChatInput] = useState("");
//   const [participants, setParticipants] = useState([usernameRef.current]);
//   const currentLanguage = LANGUAGES[selectedLanguage];


//   useEffect(()=>{
//     setAiHistory([]);
//     setAiQuestion("");
//     setAiResponse(
//       "Ask AI to explain ,debug ,optimize,or generate test cases for your code."
//     );

//   },[roomId]);

//   useEffect(() => {
//     socket.connect();


//     socket.on("participants-update", (users) => {
//   setParticipants(users);
// });
//     socket.emit("join-room", {
//       roomId,
//       username: usernameRef.current,
//     });

//     socket.on("load-code", (savedCode) => {
//       setCode(savedCode);
//     });
//     socket.on("load-language", (savedLanguage) => {
//   setSelectedLanguage(savedLanguage);
// });

//     socket.on("code-update", (updatedCode) => {
//       setCode(updatedCode);
//     });
// socket.on("language-update", ({ language, code }) => {
//   setSelectedLanguage(language);
//   setCode(code);
//   setOutput(`Ready to run ${LANGUAGES[language].label} code...`);
// });
//     socket.on("receive-message", (message) => {
//       setMessages((prev) => [...prev, message]);
//     });

//     socket.on("user-joined", (data) => {
//       setMessages((prev) => [
//         ...prev,
//         {
//           sender: "System",
//           text: data.message,
//         },
//       ]);
//     });

//     return () => {
//       socket.off("load-code");
//       socket.off("load-language");
//       socket.off("code-update");
//       socket.off("language-update");
//       socket.off("receive-message");
//       socket.off("user-joined");
//       socket.off("participants-update");
//       socket.disconnect();
//     };
//   }, [roomId]);

//   const handleCodeChange = (newvalue) => {
//     const content=newValue??"";
//     if(!activeFilepath)return;
//     setProjectFiles((prev)=>
//       prev.map((item)=>itme.type==="file"&&item.path===activeFilepath?{...item,content}:item));

//       socket.emit("file-code-change",{
//         roomId,
//         filePath:activeFilePath,

//         content,

//       }
//       );
//     };
    


//   const handleRunCode=async()=>{
//       if(!activeFile){
//         toast.error("Select afile to run");
//         return;

//     }
//     setIsRunning(true);
//     setOutput("Running...");
//     try{
//       const res=await fetch(`${BACKEND_URL}/run`,{
//         method:"POST",
//         headers:{"Content-type":"application/json"},
//         body:JSON.stringify({language:activeFile.language||"javascript",
//           code:activeFile.content||"",
//         }),
//       });

//       const data=await res.json();
//       setOutput(data.Output||data.error||"No output");
//     }

//     catch{
//       setOutput("Failed to run code.check serve rconnection");

//     }
//     finally{
//       setIsRunning(false);
//     }

  

//     const newCode = value || "";
//     setCode(newCode);

//     socket.emit("code-change", {
//       roomId,
//       code: newCode,
//     });
//   };

//   const handleLanguageChange = (e) => {
//   const newLanguage = e.target.value;
//   const newCode = CODE_SNIPPETS[newLanguage];

//   setSelectedLanguage(newLanguage);
//   setCode(newCode);
//   setOutput(`Ready to run ${LANGUAGES[newLanguage].label} code...`);

//   socket.emit("language-change", {
//     roomId,
//     language: newLanguage,
//     code: newCode,
//   });
// };

//   const sendMessage = () => {
//     if (!chatInput.trim()) return;

//     const message = {
//       sender: usernameRef.current,
//       text: chatInput,
//     };

//     setMessages((prev) => [...prev, message]);

//     socket.emit("send-message", {
//       roomId,
//       message,
//     });

//     setChatInput("");
//   };

//   const askAI = async (action) => {


//     if(!activeFile){
//       toast.error("Open a file first");
//       return;
//     }
//     const trimmedQuestion=aiQuestion.trim();
//     const userMessage=trimmedQuestion
//     ?`${action}:${trimmedQuestion}`
//     :action;

//     setIsAiLoading(true);
//     setAiResponse("AI is thinking...");
//     toast.loading("AI is thinking ... ",{id:"ai-action"});
//     try {
//     const response = await fetch(`${BACKEND_URL}/ai`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         code:activeFile.content||"",
//         language: activeFile.language||"javascript",
//         action,
//         question: trimmedQuestion,
//          history:aiHistory,
//       }),
//     });
//     const data=await response.json();


//     if(data.success){
//       setAiResponse(data.result);

//       setAiHistory((prev)=>
//         [
//         ...prev,
//         {role:"user",content:userMessage},
//         {role:"assistant",content:data.result},

//       ].slice(-8)
//     );
//     setAiQuestion("");
//     toast.success("AI response ready",{id:"ai-action"});
//   }else{
//       setAiResponse(data.error||"Something went wrong");
//       toast.error("AI failed",{id:"ai-action"});
//     }
//     }
//     catch(error){
//       setAiResponse("Server error.Make sure.Backend is running.");
//       toast.error("Server error",{id:"ai-action"});

//     }finally{
//       setIsAiLoading(false);
//     }


    


//   // setIsAiLoading(true);
//   // setAiResponse("AI is thinking...");
//   // toast.loading("AI is thinking...", { id: "ai-action" });

//   // try {
//   //   const response = await fetch(`${BACKEND_URL}/ai`, {
//   //     method: "POST",
//   //     headers: {
//   //       "Content-Type": "application/json",
//   //     },
//   //     body: JSON.stringify({
//   //       code,
//   //       language: selectedLanguage,
//   //       action,
//   //       question: trimmedQuestion,
//   //        history:aiHistory,
//   //     }),
//   //   });

//   //   const data = await response.json();

//   //   if (data.success) {
//   //     setAiResponse(data.result);
//   //     toast.success("AI response ready", { id: "ai-action" });
//   //   } else {
//   //     setAiResponse(data.error || "Something went wrong");
//   //     toast.error("AI failed", { id: "ai-action" });
//   //   }
//   // } catch (error) {
//   //   setAiResponse("Server error. Make sure backend is running.");
//   //   toast.error("Server error", { id: "ai-action" });
//   // } finally {
//   //   setIsAiLoading(false);
//   // }
// };



//   const copyCode = async () => {
//   try {
//     await navigator.clipboard.writeText(code);
//     toast.success("Code copied");
//   } catch (error) {
//     toast.error("Failed to copy code");
//   }
// };

// const downloadCode = () => {
//   const fileName = currentLanguage.file;
//   const blob = new Blob([code], { type: "text/plain" });
//   const url = URL.createObjectURL(blob);

//   const link = document.createElement("a");
//   link.href = url;
//   link.download = fileName;
//   link.click();

//   URL.revokeObjectURL(url);

//   toast.success(`${fileName} downloaded`);
// };

//   const runCode = async () => {
    
//   setIsRunning(true);
//   setOutput("Running code...");
//   toast.loading("Running code...", { id: "run-code" });

//   setTimeout(() => {
//     outputRef.current?.scrollIntoView({
//       behavior: "smooth",
//       block: "center",
//     });
//   }, 100);

//   try {
//     const response = await fetch(`${BACKEND_URL}/run`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         language: selectedLanguage,
//         code,
//       }),
//     });

//     const data = await response.json();

//     if (data.success) {
//       setOutput(data.output);
//       toast.success("Output generated", { id:"run-code" });

//     } else {
//       setOutput(data.error || "Something went wrong");
//       toast.error("Failed to run code", { id: "run-code" });

//     }
//   } catch (error) {
//     setOutput("Server error. Make sure backend is running.");
//     toast.error("Server error", { id: "run-code" });

//   } finally {
//     setIsRunning(false);

//     setTimeout(() => {
//       outputRef.current?.scrollIntoView({
//         behavior: "smooth",
//         block: "center",
//       });
//     }, 100);
//   }
// };

//   const copyRoomId = async () => {
//   navigator.clipboard.writeText(roomId);
//   toast.success("Room ID copied");
// };

//   return (
//     <div className="min-h-screen bg-[#f8fafc] text-slate-950">
//       <nav className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
//         <div>
//           <h1 className="text-xl font-black">CodeSync AI Room</h1>
//           <p className="text-sm font-medium text-slate-500">
//             Room ID: <span className="text-blue-600">{roomId}</span>
//           </p>
//         </div>

//         <div className="flex items-center gap-3">
//           <button
//             onClick={copyRoomId}
//             className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
//           >
//             Copy Room Link
//           </button>

//           <Link
//             to="/rooms"
//             className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white"
//           >
//             Exit
//           </Link>
//         </div>
//       </nav>

//       <main className="grid min-h-[calc(100vh-73px)] grid-cols-1 gap-4 p-4 lg:grid-cols-[260px_1fr_340px]">
//         <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
//           <p className="mb-4 text-xs font-black uppercase tracking-widest text-slate-400">
//             Workspace
//           </p>

//           <RoomMenu
//   active
//   text={currentLanguage.file}
//   onClick={() => scrollToSection(editorRef, "Editor opened")}
// />

// <RoomMenu
//   text="output"
//   onClick={() => scrollToSection(outputRef, "Output opened")}
// />

// <RoomMenu
//   text="team-chat"
//   onClick={() => scrollToSection(chatRef, "Team chat opened")}
// />

// <RoomMenu
//   text="ai-assistant"
//   onClick={() => scrollToSection(aiRef, "AI assistant opened")}
// />

//           <div className="mt-8 rounded-3xl border border-blue-100 bg-blue-50 p-5">
//             <h3 className="font-black text-blue-700">Live Room</h3>
//             <p className="mt-2 text-sm leading-relaxed text-slate-600">
//               Socket.IO connected. Code changes sync live inside this room.
//             </p>
//           </div>

//           <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
//   <div className="flex items-center justify-between">
//     <h3 className="font-black text-slate-900">Participants</h3>

//     <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
//       {participants.length} online
//     </span>
//   </div>

//   <div className="mt-4 space-y-3">
//     {participants.map((user, index) => (
//       <User
//         key={index}
//         name={user}
//         role={user === usernameRef.current ? "You" : "Collaborator"}
//       />
//     ))}

//     <User name="AI Bot" role="Assistant" />
//   </div>
// </div>
//         </aside>

//         <section
//   ref={editorRef}
//   className="flex flex-col rounded-3xl border border-slate-200 bg-white shadow-sm"
// >
//           <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
//             <div>
//               <h2 className="font-black text-slate-950">
//                 {currentLanguage.file}
//               </h2>
//               <p className="text-sm text-slate-500">
//                 {currentLanguage.label} editor
//               </p>
//             </div>

//            <div className="flex flex-col gap-3 sm:flex-row">
//   <select
//     value={selectedLanguage}
//     onChange={handleLanguageChange}
//     className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-blue-500"
//   >
//     <option value="javascript">JavaScript</option>
//     <option value="java">Java</option>
//     <option value="cpp">C++</option>
//     <option value="python">Python</option>
//   </select>

//   <button
//     onClick={copyCode}
//     className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
//   >
//     Copy Code
//   </button>

//   <button
//     onClick={downloadCode}
//     className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
//   >
//     Download
//   </button>

//   <button
//     onClick={runCode}
//     disabled={isRunning}
//     className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
//   >
//     {isRunning ? "Running..." : "Run Code"}
//   </button>
// </div>
//           </div>

//           <div className="min-h-[520px] flex-1 overflow-hidden bg-slate-950">
//             <Editor
//               height="520px"
//               language={selectedLanguage}
//               value={code}
//               theme="vs-dark"
//               onChange={handleCodeChange}
//               options={{
//                 fontSize: 14,
//                 fontFamily: "Fira Code, Consolas, monospace",
//                 minimap: {
//                   enabled: false,
//                 },
//                 scrollBeyondLastLine: false,
//                 automaticLayout: true,
//                 wordWrap: "on",
//                 padding: {
//                   top: 18,
//                 },
//               }}
//             />
//           </div>

//           <div ref={outputRef} className="border-t border-slate-200 bg-slate-50 p-5">
//   <div className="flex items-center justify-between">
//     <h3 className="font-black text-slate-950">Output</h3>

//     {isRunning && (
//       <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">
//         Running...
//       </span>
//     )}
//   </div>

//   <div className="mt-3 min-h-[70px] rounded-2xl bg-white p-4 font-mono text-sm text-green-700 shadow-sm whitespace-pre-wrap">
//     {output}
//   </div>
// </div>
//         </section>

//         <aside className="grid gap-4">
//         <div
//   ref={aiRef}
//   className="rounded-3xl border border-indigo-100 bg-indigo-50 p-5 shadow-sm"
// >
//   <div className="flex items-center justify-between gap-2">
//     <h3 className="text-lg font-black text-indigo-700">
//     AI Pair Programmer
//     </h3>
//     <button onClick={clearAiConversation}
//     disabled={aiHistory.lenth===0||isAiLoading}
//     className="rounded-full border-indigo-200 bg-white px-3 py-1 test-xs font-bold text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50">
//       Clear
//     </button >
//   </div>
  

//   <p className="mt-3 text-sm leading-relaxed text-slate-600">
//     Ask AI to explain your logic, debug errors, optimize code, or generate test
//     cases.
//   </p>

//   <div className="mt-5 grid grid-cols-2 gap-3">
//     <button
//       onClick={() => askAI("Explain this code")}
//       disabled={isAiLoading}
//       className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-indigo-700 shadow-sm hover:bg-indigo-100 disabled:opacity-60"
//     >
//       Explain
//     </button>

//     <button
//       onClick={() => askAI("Debug this code")}
//       disabled={isAiLoading}
//       className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-indigo-700 shadow-sm hover:bg-indigo-100 disabled:opacity-60"
//     >
//       Debug
//     </button>

//     <button
//       onClick={() => askAI("Optimize this code")}
//       disabled={isAiLoading}
//       className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-indigo-700 shadow-sm hover:bg-indigo-100 disabled:opacity-60"
//     >
//       Optimize
//     </button>

//     <button
//       onClick={() => askAI("Generate test cases")}
//       disabled={isAiLoading}
//       className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-indigo-700 shadow-sm hover:bg-indigo-100 disabled:opacity-60"
//     >
//       Test Cases
//     </button>
//   </div>

//   <textarea
//     value={aiQuestion}
//     onChange={(e) => setAiQuestion(e.target.value)}
//     placeholder="Ask custom question..."
//     className="mt-4 min-h-[80px] w-full resize-none rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-indigo-500"
//   />

//   <button
//     onClick={() => askAI("Answer custom question")}
//     disabled={isAiLoading}
//     className="mt-3 w-full rounded-2xl bg-indigo-600 px-5 py-3 font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
//   >
//     {isAiLoading ? "Thinking..." : "Ask AI"}
//   </button>

//  <div className="mt-5 max-h-[280px] space-y overflow-y-auto rounded-2xl bg-white p-4 text-sm leading-relaxed text-slate-700 shadow-sm">
//   {aiHistory.length===0?(
//     <ReactMarkdown>{aiResponse}</ReactMarkdown>
//   ):(
//     <>
//     {aiHistory.map((item,index)=>(
//       <div
//       key={index}
//       className={`rounded-xl p-3 ${
//         item.role==="user"
//         ?"bg-indigo-50 text-indigo-950"
//         :"bg-slate-50 text-slate-700"
//       }`}
//       >
//         <p className="mb-1 text-xs font-black uppercase tracking-wide text-slate-500">
//           {item.role==="user"?"You":"AI"}
//         </p>
        
   



//   <ReactMarkdown
//     components={{
//       h1: ({ children }) => (
//         <h1 className="mb-3 text-lg font-black text-slate-950">{children}</h1>
//       ),
//       h2: ({ children }) => (
//         <h2 className="mb-3 text-base font-black text-slate-950">{children}</h2>
//       ),
//       h3: ({ children }) => (
//         <h3 className="mb-2 text-sm font-black text-indigo-700">{children}</h3>
//       ),
//       p: ({ children }) => (
//         <p className="mb-3 leading-relaxed text-slate-700">{children}</p>
//       ),
//       ul: ({ children }) => (
//         <ul className="mb-3 list-disc space-y-1 pl-5">{children}</ul>
//       ),
//       ol: ({ children }) => (
//         <ol className="mb-3 list-decimal space-y-1 pl-5">{children}</ol>
//       ),
//       li: ({ children }) => <li className="text-slate-700">{children}</li>,
//       code: ({ children }) => (
//         <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-900">
//           {children}
//         </code>
//       ),
//       pre: ({ children }) => (
//         <pre className="mb-3 overflow-x-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">
//           {children}
//         </pre>
//       ),
//     }}
//   >
//     {item.content}
//     {/* {aiResponse} */}
//   </ReactMarkdown>
// </div>
//     ))}
//     {isAiLoading&&(
//       <p className="text-xs font-semibold text-indigo-600">
//         AI is thinking...
//       </p>
//     )}
//     </>
//   )}
//   </div>
// </div>
    


//           <div
//   ref={chatRef}
//   className="flex min-h-[420px] flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
// >
//             <h3 className="text-lg font-black text-slate-950">Team Chat</h3>

//             <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
//               {messages.map((msg, index) => (
//                 <div
//                   key={index}
//                   className="rounded-2xl bg-slate-50 p-3 text-sm"
//                 >
//                   <p className="font-black text-slate-900">{msg.sender}</p>
//                   <p className="mt-1 text-slate-600">{msg.text}</p>
//                 </div>
//               ))}
//             </div>

//             <div className="mt-4 flex gap-2">
//               <input
//                 value={chatInput}
//                 onChange={(e) => setChatInput(e.target.value)}
//                 onKeyDown={(e) => {
//                   if (e.key === "Enter") sendMessage();
//                 }}
//                 placeholder="Type message..."
//                 className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white"
//               />

//               <button
//                 onClick={sendMessage}
//                 className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white"
//               >
//                 Send
//               </button>
//             </div>
//           </div>
//         </aside>
//       </main>
//     </div>
//   );
// }

// function RoomMenu({ text, active }) {
//   return (
//     <div
//       className={`mb-2 rounded-2xl px-4 py-3 text-sm font-bold ${
//         active
//           ? "bg-slate-950 text-white"
//           : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
//       }`}
//     >
//       {text}
//     </div>
//   );
// }

function User({ name, role }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white">
        {name[0]}
      </div>

      <div>
        <p className="text-sm font-black text-slate-900">{name}</p>
        <p className="text-xs font-medium text-slate-500">{role}</p>
      </div>
    </div>
  );
}

export default CodeRoom;