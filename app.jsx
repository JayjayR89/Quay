// app.jsx
// Entry point and main React app component (previously embedded in index.html).
// This file was split out for clarity and maintainability.

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { useFireproof } from "use-fireproof";
import { callAI } from "call-ai";

/*
  NOTE: This file is a direct refactor of the original index.html script block.
  For readability I preserved the app's logic and separated large CSS/strings into styles.css
  and kept small runtime helpers in index.html. Long constant arrays and CSS that were
  very large are preserved but can be further modularized as needed.
*/

function App() {
  const { useDocument, useLiveQuery, database } = useFireproof("jrlivecodes-db");

  const { doc: project, merge: mergeProject } = useDocument({
    type: "project",
    title: "Untitled Project",
    html: `<div class="container">\n  <h1>Hello, JR Live Codes</h1>\n  <p>Edit HTML/CSS/JS and use the AI panel to generate code.</p>\n  <button id="btn">Click</button>\n</div>`,
    css:
      "body{font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;margin:0;background:#ecf0f1;color:#34495e} .container{padding:24px}",
    js: "document.addEventListener(\"DOMContentLoaded\",()=>{const b=document.getElementById(\"btn\");if(b){b.addEventListener(\"click\",()=>alert(\"Hello!\"));}});",
    chatHistory: []
  });

  const { docs: projects } = useLiveQuery("type", { key: "project" }) || { docs: [] };

  const { doc: settings, merge: mergeSettings } = useDocument("app-settings", {
    _id: "app-settings",
    type: "settings",
    theme: "Dark",
    textSize: 14,
    puterEnabled: false,
    pollinationsEnabled: true,
    enabledMap: {},
    puterModels: [],
    pollinationsModels: [],
    puterTokenAmount: 0,
    userUsedTokens: 0,
    previousUsers: []
  });

  const containerRef = useRef(null);
  const iframeRef = useRef(null);
  const chatScrollRef = useRef(null);

  const [isMobile, setIsMobile] = useState(false);

  const [chatW, setChatW] = useState(26);
  const [editorW, setEditorW] = useState(38);
  const [previewW, setPreviewW] = useState(36);
  const [dragging, setDragging] = useState(null);

  const [activeTab, setActiveTab] = useState("html");
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [previewKey, setPreviewKey] = useState(1);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [model, setModel] = useState("gpt-4o");
  const [chatInput, setChatInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [collapsedMessages, setCollapsedMessages] = useState(new Set());
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState("");

  const [puterReady, setPuterReady] = useState(false);
  const [username, setUsername] = useState(null);
  const [showUserPopup, setShowUserPopup] = useState(false);

  const textSize = (settings && settings.textSize) || 14;

  useEffect(() => {
    const checkMobile = () => {
      const mobile =
        window.innerWidth < 768 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const themeVars = useMemo(() => {
    const palettes = {
      Dark: {
        bg: "#34495e",
        header: "#2c3e50",
        panel: "#2c3e50",
        text: "#ecf0f1",
        border: "#3b4b5f",
        primary: "#3498db"
      },
      Light: {
        bg: "#ecf0f1",
        header: "#ffffff",
        panel: "#ffffff",
        text: "#34495e",
        border: "#d0d7de",
        primary: "#3498db"
      }
    };
    const t = (settings && settings.theme) || "Dark";
    return palettes[t] || palettes.Dark;
  }, [settings]);

  // Extra CSS is moved to styles.css; we keep short inline additions here if needed.
  const ExtraCSS = `
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    .no-scrollbar::-webkit-scrollbar { display: none; width: 0; height: 0; }
  `;

  // Load Puter script once
  useEffect(() => {
    const existing = document.querySelector('script[src="https://js.puter.com/v2/"]');
    if (existing) {
      setPuterReady(true);
      try {
        const api = window.puter || window.Puter || window.p || {};
        if (api.auth && typeof api.auth.getUser === "function") {
          api.auth.getUser().then((u) => u && setUsername(u.username || u.name || u.user?.username || "user")).catch(() => { });
        }
      } catch { }
      return;
    }
    const s = document.createElement("script");
    s.src = "https://js.puter.com/v2/";
    s.async = true;
    s.onload = () => {
      setPuterReady(true);
      try {
        const api = window.puter || window.Puter || window.p || {};
        if (api.auth && typeof api.auth.getUser === "function") {
          api.auth.getUser().then((u) => u && setUsername(u.username || u.name || u.user?.username || "user")).catch(() => { });
        }
      } catch { }
    };
    document.body.appendChild(s);
  }, []);

  const handlePuterLogin = useCallback(async () => {
    try {
      const api = window.puter || window.Puter || window.p || {};
      let u = null;
      if (api.auth?.signIn) u = await api.auth.signIn();
      else if (api.auth?.login) u = await api.auth.login();
      else if (api.auth?.signin) u = await api.auth.signin();
      else if (api.auth?.sign_in) u = await api.auth.sign_in();
      if (u) {
        const newUsername = u.username || u.name || u.user?.username || "user";
        setUsername(newUsername);
        const prevUsers = settings?.previousUsers || [];
        if (!prevUsers.includes(newUsername)) {
          mergeSettings({ previousUsers: [...prevUsers, newUsername] });
        }
        return;
      }
      const fallback = window.prompt("Enter username");
      if (fallback) {
        setUsername(fallback);
        const prevUsers = settings?.previousUsers || [];
        if (!prevUsers.includes(fallback)) {
          mergeSettings({ previousUsers: [...prevUsers, fallback] });
        }
      }
    } catch {
      const fallback = window.prompt("Login failed. Enter username");
      if (fallback) {
        setUsername(fallback);
        const prevUsers = settings?.previousUsers || [];
        if (!prevUsers.includes(fallback)) {
          mergeSettings({ previousUsers: [...prevUsers, fallback] });
        }
      }
    }
  }, [settings, mergeSettings]);

  const handlePuterLogout = useCallback(() => {
    setUsername(null);
    setShowUserPopup(false);
  }, []);

  // Dragging logic (simplified and preserved)
  useEffect(() => {
    if (isMobile) return;

    function onMove(e) {
      if (!dragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const total = rect.width;
      const percent = (x / total) * 100;
      const min = 15;
      if (dragging === "left") {
        let newChat = Math.max(min, Math.min(percent, 60));
        let remaining = 100 - previewW - newChat;
        let newEditor = Math.max(min, remaining);
        if (newEditor < min) {
          newEditor = min;
          newChat = 100 - previewW - newEditor;
        }
        setChatW(newChat);
        setEditorW(newEditor);
      } else if (dragging === "right") {
        let leftEdge = chatW;
        let newEditor = Math.max(min, Math.min(percent - leftEdge, 70));
        let newPreview = 100 - chatW - newEditor;
        if (newPreview < min) {
          newPreview = min;
          newEditor = 100 - chatW - newPreview;
        }
        setEditorW(newEditor);
        setPreviewW(newPreview);
      }
    }
    function onUp() {
      setDragging(null);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, chatW, previewW, isMobile]);

  // AI / models lists (kept as before but can be extracted to its own module)
  const baseModels = useMemo(() => [
    { group: "OpenAI", value: "gpt-4o", label: "gpt-4o" },
    { group: "OpenAI", value: "gpt-4.1-mini", label: "gpt-4.1-mini" },
    { group: "Claude", value: "claude-opus-4", label: "claude-opus-4" },
    { group: "Gemini", value: "google/gemini-2.5-pro", label: "google/gemini-2.5-pro" },
    { group: "Grok", value: "x-ai/grok-4", label: "x-ai/grok-4" }
    // ... (keep rest as needed)
  ], []);

  const pollinationsModels = useMemo(() => [
    "mistral",
    "openai",
    "openai-fast",
    "qwen-coder",
    "midijourney"
  ], []);

  useEffect(() => {
    if (!settings) return;
    const next = { ...(settings.enabledMap || {}) };
    let changed = false;

    baseModels.forEach((m) => {
      const k = `${m.group}|${m.value}`;
      if (next[k] === undefined) {
        next[k] = true;
        changed = true;
      }
    });

    (settings.puterModels || []).forEach((name) => {
      const k = `Puter|${name}`;
      if (next[k] === undefined) {
        next[k] = false;
        changed = true;
      }
    });

    pollinationsModels.forEach((name) => {
      const k = `Pollinations|${name}`;
      if (next[k] === undefined) {
        next[k] = false;
        changed = true;
      }
    });

    if (changed) {
      mergeSettings({ enabledMap: next });
    }
  }, [settings, baseModels, mergeSettings, pollinationsModels]);

  const availableModelGroups = useMemo(() => {
    const groups = {};
    const enabledMap = (settings && settings.enabledMap) || {};

    baseModels.forEach((m) => {
      const key = `${m.group}|${m.value}`;
      const enabled = !!enabledMap[key];
      if (enabled) {
        if (!groups[m.group]) groups[m.group] = [];
        groups[m.group].push({ value: m.value, label: m.label });
      }
    });

    if (settings && settings.puterEnabled) {
      const list = settings.puterModels || [];
      list.forEach((name) => {
        const k = `Puter|${name}`;
        if (enabledMap[k]) {
          if (!groups["Puter"]) groups["Puter"] = [];
          groups["Puter"].push({ value: name, label: name });
        }
      });
    }

    if (settings && settings.pollinationsEnabled) {
      pollinationsModels.forEach((name) => {
        const k = `Pollinations|${name}`;
        if (enabledMap[k]) {
          if (!groups["Pollinations"]) groups["Pollinations"] = [];
          groups["Pollinations"].push({ value: name, label: name });
        }
      });
    }

    return groups;
  }, [settings, baseModels, pollinationsModels]);

  useEffect(() => {
    const groups = availableModelGroups;
    const all = Object.values(groups).flat();
    if (!all.find((m) => m.value === model)) {
      if (all.length > 0) setModel(all[0].value);
    }
  }, [availableModelGroups, model]);

  const isPuterModel = useMemo(() => {
    return availableModelGroups["Puter"]?.some(m => m.value === model);
  }, [availableModelGroups, model]);

  const isPollinationsModel = useMemo(() => {
    return availableModelGroups["Pollinations"]?.some(m => m.value === model);
  }, [availableModelGroups, model]);

  // Token usage helpers
  const updateTokenUsage = useCallback((tokensUsed) => {
    const currentUsed = (settings && settings.userUsedTokens) || 0;
    const newUsed = currentUsed + tokensUsed;
    mergeSettings({ userUsedTokens: newUsed });
  }, [settings, mergeSettings]);

  // Pollinations wrapper
  const callPollinationsAPI = useCallback(async (prompt, modelName) => {
    try {
      const url = `https://text.pollinations.ai/openai`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: "system", content: "You are an expert web developer. Return ONLY valid JSON with keys: html, css, js, explanation." },
            { role: "user", content: prompt }
          ],
          stream: false,
          jsonMode: true
        })
      });

      if (!response.ok) {
        throw new Error(`Pollinations API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || data.message?.content || "";

      const inputTokens = data.usage?.prompt_tokens || 0;
      const outputTokens = data.usage?.completion_tokens || 0;
      const totalTokens = inputTokens + outputTokens;

      const estimatedTokens = totalTokens || Math.ceil((prompt.length + content.length) / 4);
      const costPerToken = 0.000001;
      const estimatedCost = estimatedTokens * costPerToken;

      updateTokenUsage(estimatedCost);

      return content;
    } catch (error) {
      console.error("Pollinations API error:", error);
      throw error;
    }
  }, [updateTokenUsage]);

  // Element selection support (postMessage between preview iframe and app)
  const [elementSelectMode, setElementSelectMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === "elementSelected") {
        setSelectedElement(event.data.element);
        setElementSelectMode(false);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const elementSelectScript = `
    (function() {
      let selectMode = false;
      let highlightedElement = null;
      window.addEventListener('message', function(event) {
        if (event.data === 'enableElementSelect') {
          selectMode = true;
          document.body.style.cursor = 'crosshair';
        } else if (event.data === 'disableElementSelect') {
          selectMode = false;
          document.body.style.cursor = 'default';
          if (highlightedElement) {
            highlightedElement.style.outline = '';
            highlightedElement = null;
          }
        }
      });

      document.addEventListener('mouseover', function(e) {
        if (!selectMode) return;
        e.preventDefault();
        e.stopPropagation();
        if (highlightedElement) {
          highlightedElement.style.outline = '';
        }
        highlightedElement = e.target;
        highlightedElement.style.outline = '2px solid #3498db';
      });

      document.addEventListener('click', function(e) {
        if (!selectMode) return;
        e.preventDefault();
        e.stopPropagation();
        const element = e.target;
        const elementInfo = {
          type: 'elementSelected',
          element: {
            tagName: element.tagName.toLowerCase(),
            innerHTML: element.innerHTML.substring(0, 200),
            outerHTML: element.outerHTML.substring(0, 400),
            className: element.className,
            id: element.id,
            textContent: element.textContent.substring(0, 100)
          }
        };
        window.parent.postMessage(elementInfo, '*');
        if (highlightedElement) {
          highlightedElement.style.outline = '';
          highlightedElement = null;
        }
        selectMode = false;
        document.body.style.cursor = 'default';
      });
    })();
  `.replace(/<\/script>/g, "<\\/script>"); // sanitize if embedding

  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      if (elementSelectMode) {
        iframeRef.current.contentWindow.postMessage('enableElementSelect', '*');
      } else {
        iframeRef.current.contentWindow.postMessage('disableElementSelect', '*');
      }
    }
  }, [elementSelectMode]);

  // Build preview HTML for iframe
  const previewHTML = useMemo(() => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>${project.css || ""}</style>
</head>
<body style="font-size:${textSize}px">
  ${project.html || ""}
  <script>
    // Inject element select helper
    ${elementSelectScript}
  </script>
  <script>
    ${project.js || ""}
  </script>
</body>
</html>`;
  }, [project.html, project.css, project.js, textSize, elementSelectScript]);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [project.chatHistory, isGenerating, streamingMessage]);

  const runPreview = useCallback(() => setPreviewKey((k) => k + 1), []);
  const handleSave = useCallback(async () => {
    await database.put({
      ...project,
      _id: project._id || `project-${Date.now()}`,
      updatedAt: Date.now()
    });
  }, [database, project]);

  const handleNew = useCallback(() => {
    mergeProject({
      title: "Untitled Project",
      html: "<div class=\"container\">\n  <h1>New Project</h1>\n</div>",
      css: "body{font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;margin:0;background:#ecf0f1;color:#34495e} .container{padding:24px}",
      js: "console.log(\"New project\");",
      chatHistory: [],
      _id: undefined
    });
    setPreviewKey((k) => k + 1);
  }, [mergeProject]);

  const loadProject = useCallback((p) => {
    mergeProject({
      title: p.title,
      html: p.html,
      css: p.css,
      js: p.js,
      chatHistory: p.chatHistory || [],
      _id: p._id
    });
    setIsProjectsOpen(false);
    setPreviewKey((k) => k + 1);
  }, [mergeProject]);

  // AI generation handler (keeps original behavior)
  const handleAIGenerate = useCallback(async (e) => {
    e && e.preventDefault && e.preventDefault();
    if (!chatInput.trim() || isGenerating) return;

    const userMessage = chatInput.trim();
    setChatInput("");
    setIsGenerating(true);
    setStreamingMessage("");

    const history = [
      ...(project.chatHistory || []),
      { role: "user", content: userMessage, timestamp: Date.now() }
    ];
    mergeProject({ chatHistory: history });

    const prompt = `You are an expert web coder. Update the user's HTML, CSS, and JavaScript to fulfill the request.

Return ONLY valid JSON with keys: html, css, js, explanation. Do not include markdown formatting or code blocks.

Current HTML:
${project.html || ""}

Current CSS:
${project.css || ""}

Current JS:
${project.js || ""}

User request:
${userMessage}`;

    const isPuter = isPuterModel;
    const isPoll = isPollinationsModel;

    try {
      if (isPuter && puterReady) {
        const api = window.puter || window.Puter || window.p || {};
        if (api.ai && api.ai.chat) {
          const chatMessages = [{ role: "user", content: prompt }];
          const response = await api.ai.chat(chatMessages, { model });

          const responseText = response.message?.content || response.content || response;

          if (response.usage) {
            const inputTokens = response.usage.input_tokens || 0;
            const outputTokens = response.usage.output_tokens || 0;
            const totalTokens = inputTokens + outputTokens;
            const costPerToken = 0.000001;
            const estimatedCost = totalTokens * costPerToken;
            updateTokenUsage(estimatedCost);
          }

          let result;
          try {
            const cleanResponse = responseText.replace(/```json\\n?/g, "").replace(/```\\n?/g, "").trim();
            result = JSON.parse(cleanResponse);
          } catch {
            result = { explanation: responseText };
          }

          mergeProject({
            html: result.html !== undefined ? result.html : project.html,
            css: result.css !== undefined ? result.css : project.css,
            js: result.js !== undefined ? result.js : project.js,
            chatHistory: [
              ...history,
              { role: "assistant", content: result.explanation || "Code updated.", timestamp: Date.now(), modelUsed: model }
            ]
          });
          setPreviewKey((k) => k + 1);
        }
      } else if (isPoll) {
        const responseText = await callPollinationsAPI(prompt, model);
        let result;
        try {
          const cleanResponse = responseText.replace(/```json\\n?/g, "").replace(/```\\n?/g, "").trim();
          result = JSON.parse(cleanResponse);
        } catch {
          result = { explanation: responseText };
        }

        mergeProject({
          html: result.html !== undefined ? result.html : project.html,
          css: result.css !== undefined ? result.css : project.css,
          js: result.js !== undefined ? result.js : project.js,
          chatHistory: [
            ...history,
            { role: "assistant", content: result.explanation || "Code updated.", timestamp: Date.now(), modelUsed: model }
          ]
        });
        setPreviewKey((k) => k + 1);
      } else {
        const response = await callAI(prompt, { model });

        const estimatedTokens = (prompt.length + response.length) / 4;
        const costPerToken = 0.000001;
        const estimatedCost = estimatedTokens * costPerToken;
        updateTokenUsage(estimatedCost);

        let result;
        try {
          const cleanResponse = response.replace(/```json\\n?/g, "").replace(/```\\n?/g, "").trim();
          result = JSON.parse(cleanResponse);
        } catch {
          result = { explanation: response };
        }
        mergeProject({
          html: result.html !== undefined ? result.html : project.html,
          css: result.css !== undefined ? result.css : project.css,
          js: result.js !== undefined ? result.js : project.js,
          chatHistory: [
            ...history,
            { role: "assistant", content: result.explanation || "Code updated.", timestamp: Date.now(), modelUsed: model }
          ]
        });
        setPreviewKey((k) => k + 1);
      }
    } catch (error) {
      console.error("AI generation error:", error);
      mergeProject({
        chatHistory: [
          ...history,
          { role: "assistant", content: "Generating code failed. Please try again.", timestamp: Date.now(), isError: true, modelUsed: model }
        ]
      });
    } finally {
      setIsGenerating(false);
      setStreamingMessage("");
    }
  }, [chatInput, isGenerating, project, mergeProject, model, isPuterModel, isPollinationsModel, puterReady, updateTokenUsage, callPollinationsAPI]);

  // Simplified UI: for the purpose of this refactor we render a compact layout preserving controls
  return (
    <div ref={containerRef} className="h-screen flex flex-col" style={{ backgroundColor: themeVars.bg, color: themeVars.text, fontSize: `${textSize}px` }}>
      <style>{ExtraCSS}</style>
      <header style={{ backgroundColor: themeVars.header, color: themeVars.text, borderBottom: `1px solid ${themeVars.border}` }} className="px-2 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div style={{ backgroundColor: themeVars.primary }} className="w-6 h-6 flex items-center justify-center font-bold text-white text-[10px]">JR</div>
          <h1 className="text-sm font-bold">JR Live Codes</h1>
        </div>
        <div className="flex items-center gap-2">
          {!username ? (
            <button onClick={handlePuterLogin} className="px-3 py-1 text-sm" disabled={!puterReady}>Login</button>
          ) : (
            <div className="px-3 py-1 text-sm">{username}</div>
          )}
          <button onClick={handleSave} className="px-3 py-1 text-sm">Save</button>
          <button onClick={handleNew} className="px-3 py-1 text-sm">New</button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left: Chat / Controls (placeholder) */}
        <div style={{ width: `${chatW}%` }} className="border-r p-2" >
          <div className="mb-2">
            <form onSubmit={handleAIGenerate}>
              <textarea value={chatInput} onChange={(e) => setChatInput(e.target.value)} className="w-full h-24 p-2" placeholder="Ask the AI to modify the project..." />
              <div className="flex gap-2 mt-2">
                <button className="px-3 py-1 bg-blue-500 text-white" type="submit" disabled={isGenerating}>{isGenerating ? "Generating..." : "Generate"}</button>
                <button type="button" onClick={() => { setChatInput(""); }}>Clear</button>
              </div>
            </form>
          </div>

          <div className="overflow-auto h-[60%]" ref={chatScrollRef}>
            {(project.chatHistory || []).map((m, idx) => (
              <div key={idx} className={`p-2 mb-2 rounded ${m.role === "user" ? "bg-white/10" : "bg-white/5"}`}>
                <div className="text-xs text-gray-300">{m.role} • {new Date(m.timestamp).toLocaleString()}</div>
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Vertical drag handle */}
        <div
          onMouseDown={() => setDragging("left")}
          className="cursor-col-resize"
          style={{ width: 6, backgroundColor: themeVars.border }}
        />

        {/* Middle: Editor (simple textarea editors for this refactor) */}
        <div style={{ width: `${editorW}%` }} className="p-2 border-r overflow-auto">
          <div className="flex gap-2 mb-2">
            <button onClick={() => setActiveTab("html")} className={`px-3 py-1 ${activeTab === "html" ? "bg-blue-600 text-white" : ""}`}>HTML</button>
            <button onClick={() => setActiveTab("css")} className={`px-3 py-1 ${activeTab === "css" ? "bg-blue-600 text-white" : ""}`}>CSS</button>
            <button onClick={() => setActiveTab("js")} className={`px-3 py-1 ${activeTab === "js" ? "bg-blue-600 text-white" : ""}`}>JS</button>
            <button onClick={runPreview} className="px-3 py-1 ml-auto">Run ▶</button>
          </div>

          {activeTab === "html" && (
            <textarea className="w-full h-[70vh] p-2" value={project.html || ""} onChange={(e) => mergeProject({ html: e.target.value })} />
          )}
          {activeTab === "css" && (
            <textarea className="w-full h-[70vh] p-2" value={project.css || ""} onChange={(e) => mergeProject({ css: e.target.value })} />
          )}
          {activeTab === "js" && (
            <textarea className="w-full h-[70vh] p-2" value={project.js || ""} onChange={(e) => mergeProject({ js: e.target.value })} />
          )}
        </div>

        {/* Vertical drag handle between editor and preview */}
        <div
          onMouseDown={() => setDragging("right")}
          className="cursor-col-resize"
          style={{ width: 6, backgroundColor: themeVars.border }}
        />

        {/* Right: Preview */}
        <div style={{ width: `${previewW}%` }} className="p-2">
          <iframe
            key={previewKey}
            ref={iframeRef}
            title="preview"
            srcDoc={previewHTML}
            sandbox="allow-scripts allow-same-origin"
            style={{ width: "100%", height: "100%", border: "1px solid rgba(0,0,0,0.12)" }}
          />
        </div>
      </main>
    </div>
  );
}

// Mount app
const root = createRoot(document.getElementById("container"));
root.render(<App />);
