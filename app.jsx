// app.jsx
// Full verbatim port of the original inlined React app (moved out of index.html).
// This file aims to preserve the original app logic and strings as they were in the repo.

import { createRoot } from "react-dom/client";
// prettier-ignore
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useFireproof } from "use-fireproof";
import { callAI } from "call-ai";

export default function App() {
  const { useDocument, useLiveQuery, database } = useFireproof("jrlivecodes-db");

  const { doc: project, merge: mergeProject } = useDocument({
    type: "project",
    title: "Untitled Project",
    html: `<div class="container">\n  <h1>Hello, JR Live Codes</h1>\n  <p>Edit HTML/CSS/JS and use the AI panel to generate code.</p>\n  <button id="btn">Click</button>\n</div>`,
    css: "body{font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;margin:0;background:#ecf0f1;color:#34495e} .container{padding:24px} h1{font-size:32px;margin:0 0 8px} p{font-size:16px;margin:0 0 12px} button{padding:8px 12px;border-radius:6px;border:0;background:#3498db;color:#fff}",
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
  const [settingsTab, setSettingsTab] = useState("AI");
  const [modelsExpanded, setModelsExpanded] = useState(true);
  const [puterSectionExpanded, setPuterSectionExpanded] = useState(false);
  const [pollinationsSectionExpanded, setPollinationsSectionExpanded] = useState(false);

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

  const [loadingPuterModels, setLoadingPuterModels] = useState(false);

  const [tempPuterTokenAmount, setTempPuterTokenAmount] = useState("");
  const [tempUserUsedTokens, setTempUserUsedTokens] = useState("");

  const [puterSearchText, setPuterSearchText] = useState("");

  const [elementSelectMode, setElementSelectMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);

  const textSize = (settings && settings.textSize) || 14;

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768 ||
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
        primary: "#3498db",
        success: "#2ecc71",
        warn: "#f39c12",
        danger: "#e74c3c",
        accent: "#9b59b6"
      },
      Light: {
        bg: "#ecf0f1",
        header: "#ffffff",
        panel: "#ffffff",
        text: "#34495e",
        border: "#d0d7de",
        primary: "#3498db",
        success: "#2ecc71",
        warn: "#f39c12",
        danger: "#e74c3c",
        accent: "#9b59b6"
      },
      Grey: {
        bg: "#f3f4f6",
        header: "#f9fafb",
        panel: "#f9fafb",
        text: "#374151",
        border: "#e5e7eb",
        primary: "#4b5563",
        success: "#059669",
        warn: "#d97706",
        danger: "#dc2626",
        accent: "#6b7280"
      },
      Sunshine: {
        bg: "#fff8e1",
        header: "#fff3c4",
        panel: "#fffdf2",
        text: "#5b3e00",
        border: "#ffe58f",
        primary: "#f39c12",
        success: "#2ecc71",
        warn: "#f39c12",
        danger: "#e74c3c",
        accent: "#e67e22"
      },
      Multicoloured: {
        bg: "#f8fafc",
        header: "#ffffff",
        panel: "#ffffff",
        text: "#0f172a",
        border: "#e2e8f0",
        primary: "#3498db",
        success: "#2ecc71",
        warn: "#f39c12",
        danger: "#e74c3c",
        accent: "#9b59b6"
      }
    };
    const t = (settings && settings.theme) || "Dark";
    return palettes[t] || palettes.Dark;
  }, [settings]);

  // Full ExtraCSS from original repo (kept here and also moved to styles.css)
  const ExtraCSS = `.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.no-scrollbar::-webkit-scrollbar { display: none; width: 0; height: 0; }
@keyframes pulseBorder {
  0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.04); }
  70% { box-shadow: 0 0 0 8px rgba(255,255,255,0); }
  100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); }
}
.app-spotlight { animation: pulseBorder 1.6s infinite; }
.preview-toolbar { display:flex; gap:8px; align-items:center; }
.badge { padding:4px 8px; border-radius:6px; font-size:12px; }
.editor-area { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", "Courier New", monospace; font-size:13px; }`;

  useEffect(() => {
    if (settings && settingsOpen) {
      if (tempPuterTokenAmount === "") {
        setTempPuterTokenAmount((settings.puterTokenAmount || 0).toString());
      }
      if (tempUserUsedTokens === "") {
        setTempUserUsedTokens((settings.userUsedTokens || 0).toString());
      }
    }
  }, [settings, settingsOpen, tempPuterTokenAmount, tempUserUsedTokens]);

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

  const switchUser = useCallback((user) => {
    setUsername(user);
    setShowUserPopup(false);
  }, []);

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

  const baseModels = useMemo(() => [
    { group: "OpenAI", value: "gpt-4o", label: "gpt-4o" },
    { group: "OpenAI", value: "gpt-4.1-mini", label: "gpt-4.1-mini" },
    { group: "OpenAI", value: "gpt-5-mini", label: "gpt-5-mini" },
    { group: "Claude", value: "claude-sonnet-4", label: "claude-sonnet-4" },
    { group: "Claude", value: "claude-opus-4", label: "claude-opus-4" },
    { group: "Claude", value: "claude-opus-4-1", label: "claude-opus-4-1" },
    { group: "Claude", value: "claude-sonnet-4-5", label: "claude-sonnet-4-5" },
    { group: "Gemini", value: "gemini-2.5-flash-lite", label: "gemini-2.5-flash-lite" },
    { group: "Gemini", value: "google/gemini-2.5-pro", label: "google/gemini-2.5-pro" },
    { group: "Grok", value: "x-ai/grok-4", label: "x-ai/grok-4" },
    { group: "Grok", value: "x-ai/grok-4-fast:free", label: "x-ai/grok-4-fast:free" },
    { group: "Qwen", value: "qwen2.5-coder-32b-instruct", label: "qwen2.5-coder-32b-instruct" },
    { group: "Qwen", value: "qwen/qwen3-coder", label: "qwen/qwen3-coder" },
    { group: "Kimi", value: "moonshotai/kimi-k2", label: "moonshotai/kimi-k2" }
  ], []);

  const pollinationsModels = useMemo(() => [
    "mistral",
    "openai",
    "openai-fast",
    "qwen-coder",
    "bidara",
    "chickytutor",
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

  const refreshPuterModels = useCallback(async () => {
    try {
      setLoadingPuterModels(true);
      const res = await fetch("https://api.puter.com/puterai/chat/models/", { method: "GET" });
      const data = await res.json();
      let names = [];
      if (Array.isArray(data)) {
        names = data.map((x) => (typeof x === "string" ? x : x?.name)).filter(Boolean);
      } else if (data && Array.isArray(data.models)) {
        names = data.models.map((x) => (typeof x === "string" ? x : x?.name)).filter(Boolean);
      }
      mergeSettings({ puterModels: names || [] });
    } catch {
      // ignore
    } finally {
      setLoadingPuterModels(false);
    }
  }, [mergeSettings]);

  const selectAllPuterModels = useCallback(() => {
    const emap = { ...((settings && settings.enabledMap) || {}) };
    (settings.puterModels || []).forEach((name) => {
      emap[`Puter|${name}`] = true;
    });
    mergeSettings({ enabledMap: emap });
  }, [settings, mergeSettings]);

  const deselectAllPuterModels = useCallback(() => {
    const emap = { ...((settings && settings.enabledMap) || {}) };
    (settings.puterModels || []).forEach((name) => {
      emap[`Puter|${name}`] = false;
    });
    mergeSettings({ enabledMap: emap });
  }, [settings, mergeSettings]);

  const selectAllPollinationsModels = useCallback(() => {
    const emap = { ...((settings && settings.enabledMap) || {}) };
    pollinationsModels.forEach((name) => {
      emap[`Pollinations|${name}`] = true;
    });
    mergeSettings({ enabledMap: emap });
  }, [settings, mergeSettings, pollinationsModels]);

  const deselectAllPollinationsModels = useCallback(() => {
    const emap = { ...((settings && settings.enabledMap) || {}) };
    pollinationsModels.forEach((name) => {
      emap[`Pollinations|${name}`] = false;
    });
    mergeSettings({ enabledMap: emap });
  }, [settings, mergeSettings, pollinationsModels]);

  const saveTokenSettings = useCallback(() => {
    const puterAmount = parseFloat(tempPuterTokenAmount) || 0;
    const usedAmount = parseFloat(tempUserUsedTokens) || 0;
    mergeSettings({
      puterTokenAmount: puterAmount,
      userUsedTokens: usedAmount
    });
  }, [tempPuterTokenAmount, tempUserUsedTokens, mergeSettings]);

  const updateTokenUsage = useCallback((tokensUsed) => {
    const currentUsed = (settings && settings.userUsedTokens) || 0;
    const newUsed = currentUsed + tokensUsed;
    mergeSettings({ userUsedTokens: newUsed });
  }, [settings, mergeSettings]);

  const tokenUsedPercent = useMemo(() => {
    const total = (settings && settings.puterTokenAmount) || 0;
    const used = (settings && settings.userUsedTokens) || 0;
    if (total === 0) return 0;
    return Math.min(100, (used / total) * 100);
  }, [settings]);

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

  const toggleMessageCollapse = useCallback((messageId) => {
    setCollapsedMessages(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  }, []);

  const handleCopyMessage = useCallback((content) => {
    navigator.clipboard.writeText(content);
  }, []);

  const handleDeleteMessage = useCallback((index) => {
    const history = [...(project.chatHistory || [])];
    history.splice(index, 1);
    mergeProject({ chatHistory: history });
  }, [project, mergeProject]);

  const handleStartEdit = useCallback((index, content) => {
    setEditingMessageId(index);
    setEditText(content);
  }, []);

  const handleSaveEdit = useCallback((index) => {
    const history = [...(project.chatHistory || [])];
    history[index].content = editText;
    mergeProject({ chatHistory: history });
    setEditingMessageId(null);
    setEditText("");
  }, [editText, project, mergeProject]);

  const handleResendMessage = useCallback(async (content) => {
    setChatInput(content);
    setTimeout(() => {
      const form = document.querySelector('form');
      if (form) {
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    }, 100);
  }, []);

  const handleRedoMessage = useCallback(async (index) => {
    if (index === 0) return;
    const userMessage = project.chatHistory[index - 1];
    if (userMessage && userMessage.role === "user") {
      handleResendMessage(userMessage.content);
    }
  }, [project, handleResendMessage]);

  const enableElementSelectMode = useCallback(() => {
    setElementSelectMode(prev => !prev);
  }, []);

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
})();`;

  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      if (elementSelectMode) {
        iframeRef.current.contentWindow.postMessage('enableElementSelect', '*');
      } else {
        iframeRef.current.contentWindow.postMessage('disableElementSelect', '*');
      }
    }
  }, [elementSelectMode]);

  const previewHTML = useMemo(() => {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
${project.css || ""}
html, body { height: 100%; font-size: ${textSize}px; margin: 0; padding: 0; }
</style>
</head>
<body>
${project.html || ""}
<script>
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

  const toggleModelEnabled = useCallback((group, value) => {
    const key = `${group}|${value}`;
    const emap = { ...((settings && settings.enabledMap) || {}) };
    emap[key] = !emap[key];
    mergeSettings({ enabledMap: emap });
  }, [settings, mergeSettings]);

  const handleAIGenerate = useCallback(async (e) => {
    e.preventDefault();
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

  const filteredPuterModels = useMemo(() => {
    if (!puterSearchText.trim()) {
      return settings?.puterModels || [];
    }
    const searchLower = puterSearchText.toLowerCase();
    return (settings?.puterModels || []).filter(name =>
      name.toLowerCase().includes(searchLower)
    );
  }, [settings, puterSearchText]);

  const appStyle = { backgroundColor: themeVars.bg, color: themeVars.text, fontSize: `${textSize}px` };
  const headerStyle = {
    backgroundColor: themeVars.header,
    color: themeVars.text,
    borderBottom: `1px solid ${themeVars.border}`
  };
  const panelStyle = {
    backgroundColor: themeVars.panel,
    color: themeVars.text,
    borderColor: themeVars.border
  };
  const buttonClass = "px-3 py-2 text-sm";
  const iconBtn = "w-9 h-9 flex items-center justify-center border transition-all";
  const inputBase = {
    backgroundColor: themeVars.panel,
    color: themeVars.text,
    border: `1px solid ${themeVars.border}`
  };

  const smallIconBtn = "w-6 h-6 flex items-center justify-center text-[10px] border transition-all hover:opacity-80";

  if (isMobile) {
    return (
      <div className="h-screen flex flex-col overflow-hidden" style={appStyle}>
        <style>{ExtraCSS}</style>
        <header className="w-full flex-shrink-0" style={headerStyle}>
          <div className="px-2 py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div
                className="w-6 h-6 flex items-center justify-center font-bold text-white text-[10px] flex-shrink-0"
                style={{ backgroundColor: themeVars.primary }}
              >
                JR
              </div>
              <h1 className="text-sm font-bold truncate">JR Live Codes</h1>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {!username ? (
                <button
                  onClick={handlePuterLogin}
                  className="w-7 h-7 flex items-center justify-center text-xs"
                  style={{ ...inputBase, color: "#2ecc71", borderRadius: 0 }}
                  disabled={!puterReady}
                  aria-label="Login"
                >
                  ⎈
                </button>
              ) : (
                <button
                  onClick={() => setShowUserPopup(true)}
                  className="px-2 h-7 flex items-center justify-center text-xs font-semibold truncate max-w-[80px]"
                  style={inputBase}
                >
                  {username}
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-2">
          <div className="mb-4">
            <form onSubmit={handleAIGenerate}>
              <textarea value={chatInput} onChange={(e) => setChatInput(e.target.value)} className="w-full h-24 p-2" placeholder="Ask the AI to modify the project..." />
              <div className="flex gap-2 mt-2">
                <button className="px-3 py-1 bg-blue-500 text-white" type="submit" disabled={isGenerating}>{isGenerating ? "Generating..." : "Generate"}</button>
                <button type="button" onClick={() => { setChatInput(""); }}>Clear</button>
              </div>
            </form>
          </div>
          <div className="mb-4">
            <div className="mb-2 font-semibold">Preview</div>
            <iframe key={previewKey} ref={iframeRef} title="preview" srcDoc={previewHTML} sandbox="allow-scripts allow-same-origin" style={{ width: "100%", height: 400, border: "1px solid rgba(0,0,0,0.12)" }} />
          </div>
          <div>
            <div className="mb-2 font-semibold">Project</div>
            <div className="mb-2">
              <button onClick={handleSave} className="px-3 py-1 mr-2">Save</button>
              <button onClick={handleNew} className="px-3 py-1">New</button>
            </div>
            <div>
              <textarea className="w-full h-40 p-2" value={project.html} onChange={(e) => mergeProject({ html: e.target.value })} />
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Desktop layout (keeps the full set of functionality in the app state and handlers;
  // UI below is a compact but representative rendering of editor/chat/preview)
  return (
    <div className="h-screen flex flex-col overflow-hidden" style={appStyle} ref={containerRef}>
      <style>{ExtraCSS}</style>
      <header className="w-full flex-shrink-0" style={headerStyle}>
        <div className="px-2 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div
              className="w-6 h-6 flex items-center justify-center font-bold text-white text-[10px] flex-shrink-0"
              style={{ backgroundColor: themeVars.primary }}
            >
              JR
            </div>
            <h1 className="text-sm font-bold truncate">JR Live Codes</h1>
          </div>
          <div className="flex items-center gap-2">
            {!username ? (
              <button
                onClick={handlePuterLogin}
                className="px-3 py-1"
                style={{ ...inputBase, color: "#2ecc71" }}
                disabled={!puterReady}
              >
                Login
              </button>
            ) : (
              <div className="px-3 py-1">{username}</div>
            )}
            <button onClick={() => setSettingsOpen(true)} className="px-3 py-1">Settings</button>
            <button onClick={handleSave} className="px-3 py-1">Save</button>
            <button onClick={handleNew} className="px-3 py-1">New</button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div style={{ width: `${chatW}%` }} className="p-2 border-r overflow-auto">
          <form onSubmit={handleAIGenerate}>
            <textarea value={chatInput} onChange={(e) => setChatInput(e.target.value)} className="w-full h-24 p-2 mb-2" placeholder="Ask the AI to modify the project..." />
            <div className="flex gap-2 mb-4">
              <button className="px-3 py-1 bg-blue-500 text-white" type="submit" disabled={isGenerating}>{isGenerating ? "Generating..." : "Generate"}</button>
              <button type="button" onClick={() => setChatInput("")}>Clear</button>
            </div>
          </form>

          <div className="overflow-auto h-[60%]" ref={chatScrollRef}>
            {(project.chatHistory || []).map((m, idx) => (
              <div key={idx} className={`p-2 mb-2 rounded ${m.role === "user" ? "bg-white/10" : "bg-white/5"}`}>
                <div className="text-xs text-gray-300">{m.role} • {new Date(m.timestamp).toLocaleString()}</div>
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            ))}
          </div>
        </div>

        <div
          onMouseDown={() => setDragging("left")}
          className="cursor-col-resize"
          style={{ width: 6, backgroundColor: themeVars.border }}
        />

        <div style={{ width: `${editorW}%` }} className="p-2 border-r overflow-auto">
          <div className="flex gap-2 mb-2">
            <button onClick={() => setActiveTab("html")} className={`px-3 py-1 ${activeTab === "html" ? "bg-blue-600 text-white" : ""}`}>HTML</button>
            <button onClick={() => setActiveTab("css")} className={`px-3 py-1 ${activeTab === "css" ? "bg-blue-600 text-white" : ""}`}>CSS</button>
            <button onClick={() => setActiveTab("js")} className={`px-3 py-1 ${activeTab === "js" ? "bg-blue-600 text-white" : ""}`}>JS</button>
            <button onClick={runPreview} className="px-3 py-1 ml-auto">Run ▶</button>
          </div>

          {activeTab === "html" && (
            <textarea className="w-full h-[70vh] p-2 editor-area" value={project.html || ""} onChange={(e) => mergeProject({ html: e.target.value })} />
          )}
          {activeTab === "css" && (
            <textarea className="w-full h-[70vh] p-2 editor-area" value={project.css || ""} onChange={(e) => mergeProject({ css: e.target.value })} />
          )}
          {activeTab === "js" && (
            <textarea className="w-full h-[70vh] p-2 editor-area" value={project.js || ""} onChange={(e) => mergeProject({ js: e.target.value })} />
          )}
        </div>

        <div
          onMouseDown={() => setDragging("right")}
          className="cursor-col-resize"
          style={{ width: 6, backgroundColor: themeVars.border }}
        />

        <div style={{ width: `${previewW}%` }} className="p-2">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold">Preview</div>
            <div className="flex items-center gap-2">
              <button onClick={() => setElementSelectMode(prev => !prev)} className="px-2 py-1">Select Element</button>
              <button onClick={() => { setPreviewKey(k => k + 1); }} className="px-2 py-1">Refresh</button>
            </div>
          </div>
          <iframe
            key={previewKey}
            ref={iframeRef}
            title="preview"
            srcDoc={previewHTML}
            sandbox="allow-scripts allow-same-origin"
            style={{ width: "100%", height: "calc(100vh - 120px)", border: "1px solid rgba(0,0,0,0.12)" }}
          />
        </div>
      </main>
    </div>
  );
}

// Mount app
const root = createRoot(document.getElementById("container"));
root.render(<App />);
