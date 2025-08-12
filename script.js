// =================================================================================
// IMPORTANT: CONFIGURATION
// =================================================================================
const firebaseConfig = {
    apiKey: "AIzaSyBT_QyQuC1FdIT37vfx5vjzvP8Fk4AhERc",
    authDomain: "textdrai-app.firebaseapp.com",
    projectId: "textdrai-app",
    storageBucket: "textdrai-app.firebasestorage.app",
    messagingSenderId: "434765361275",
    appId: "1:434765361275:web:a6ad74fcbdd77c9ca8f2de"
};

// =================================================================================
// FIREBASE INITIALIZATION
// =================================================================================
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// =================================================================================
// DOM Elements
// =================================================================================
const topLoader = document.getElementById('top-loader');
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const loginView = document.getElementById('login-view');
const signupView = document.getElementById('signup-view');
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const passwordError = document.getElementById('password-error');
const userInput = document.getElementById('user-input');
const chatMessages = document.getElementById('chat-messages');
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menu-toggle');
const imageUploadButton = document.getElementById('image-upload-button');
const imageUploadInput = document.getElementById('image-upload-input');
const imagePreviewContainer = document.getElementById('image-preview-container');

// =================================================================================
// Global State Variables
// =================================================================================
let currentChatId = null;
let currentUser = null;
let loginAttempts = 0;
let currentUtterance = null;
let attachedImages = [];

// =================================================================================
// API KEY MANAGEMENT
// =================================================================================
async function getApiKey() {
    const pipedreamUrl = "https://shy-mountain-4f55.preciousgodpower065.workers.dev/";
    if (pipedreamUrl.includes("eoxxxxxxxxxxxxxxxx") || !pipedreamUrl.startsWith("https://")) {
        addMessageToUI('assistant', { text: '<b>Configuration Error:</b> Pipedream URL not set.' });
        return null;
    }
    try {
        const response = await fetch(pipedreamUrl);
        if (!response.ok) { throw new Error(`Pipedream responded with status: ${response.status}`); }
        const data = await response.json();
        return data.apiKey;
    } catch (error) {
        addMessageToUI('assistant', { text: `<b>Security Error:</b> Could not retrieve API Key.` });
        return null;
    }
}

// =================================================================================
// AUTHENTICATION & UI LOGIC
// =================================================================================
document.getElementById('show-signup').addEventListener('click', (e) => { e.preventDefault(); loginView.classList.add('hidden'); signupView.classList.remove('hidden'); });
document.getElementById('show-login').addEventListener('click', (e) => { e.preventDefault(); signupView.classList.add('hidden'); loginView.classList.remove('hidden'); });
document.getElementById('signup-button').addEventListener('click', () => {
    const firstName = document.getElementById('signup-firstname').value.trim();
    const lastName = document.getElementById('signup-lastname').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    if (!firstName || !lastName || !email || !password || !confirmPassword) { alert("Please fill in all fields."); return; }
    if (password !== confirmPassword) { alert("Passwords do not match."); return; }
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
        alert(passwordValidation.message);
        if (passwordValidation.clearInput) {
            document.getElementById('signup-password').value = "";
            document.getElementById('signup-confirm-password').value = "";
        }
        return;
    }
    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => userCredential.user.updateProfile({ displayName: `${firstName} ${lastName}` }))
        .then(() => alert("Account created successfully! You are now logged in."))
        .catch(error => alert(`Signup Failed: ${error.message}`));
});
document.getElementById('login-button').addEventListener('click', () => {
    auth.signInWithEmailAndPassword(loginEmailInput.value, loginPasswordInput.value)
        .catch(error => {
            loginPasswordInput.classList.add('invalid'); loginEmailInput.classList.add('invalid');
            if (passwordError) passwordError.textContent = "Incorrect password or email.";
            loginAttempts++;
            if (loginAttempts >= 5) { alert("Too many failed login attempts. Please try signing in with Google or GitHub."); }
        });
});
loginPasswordInput.addEventListener('input', () => { if (loginPasswordInput.classList.contains('invalid')) { loginPasswordInput.classList.remove('invalid'); loginEmailInput.classList.remove('invalid'); if (passwordError) passwordError.textContent = ""; } });
loginEmailInput.addEventListener('input', () => { if (loginEmailInput.classList.contains('invalid')) { loginPasswordInput.classList.remove('invalid'); loginEmailInput.classList.remove('invalid'); if (passwordError) passwordError.textContent = ""; } });
document.getElementById('google-signin-button').addEventListener('click', () => { auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(error => alert(`Google Sign-in Failed: ${error.message}`)); });
document.getElementById('github-signin-button').addEventListener('click', () => { auth.signInWithPopup(new firebase.auth.GithubAuthProvider()).catch(error => alert(`GitHub Sign-in Failed: ${error.message}`)); });
document.getElementById('logout-button').addEventListener('click', () => { speechSynthesis.cancel(); auth.signOut(); });
showLoader();
auth.onAuthStateChanged(user => {
    hideLoader();
    if (user) {
        currentUser = user; loginAttempts = 0;
        authContainer.classList.add('hidden'); appContainer.classList.remove('hidden');
        document.getElementById('user-email-display').textContent = user.displayName || user.email;
        const profilePicElement = document.getElementById('profile-picture');
        if (user.photoURL) { profilePicElement.style.backgroundImage = `url(${user.photoURL})`; profilePicElement.textContent = ''; }
        else { profilePicElement.style.backgroundImage = ''; profilePicElement.textContent = (user.displayName || user.email || 'U')[0].toUpperCase(); }
        initializeAppFunctions();
    } else {
        currentUser = null;
        authContainer.classList.remove('hidden'); appContainer.classList.add('hidden');
    }
});
function validatePassword(password) {
    if (/[+×÷=!/<>^%£*;,()\[\]]/.test(password)) return { isValid: false, message: "Password contains invalid symbols.", clearInput: true };
    if (!/[@#_]/.test(password)) return { isValid: false, message: "Password is not strong enough. Please include @, #, or _.", clearInput: false };
    return { isValid: true };
}
document.querySelectorAll('.password-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
        const passwordInput = toggle.previousElementSibling;
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        toggle.classList.toggle('fa-eye'); toggle.classList.toggle('fa-eye-slash');
    });
});

// =================================================================================
// CORE APP & UI LOGIC
// =================================================================================
function initializeAppFunctions() { loadOpenRouterModels(); loadChatHistory(); createNewChat(); }
menuToggle.addEventListener('click', () => sidebar.classList.toggle('active'));
userInput.addEventListener('input', () => { userInput.style.height = 'auto'; userInput.style.height = `${Math.min(userInput.scrollHeight, 200)}px`; });
imageUploadButton.addEventListener('click', () => imageUploadInput.click());
imageUploadInput.addEventListener('change', (event) => {
    const files = event.target.files;
    if (!files) return;
    if (attachedImages.length + files.length > 4) { alert("You can only upload a maximum of 4 images."); return; }
    imagePreviewContainer.classList.remove('hidden');
    for (const file of files) {
        if (!file.type.startsWith("image/")) continue;
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageDataUrl = e.target.result;
            attachedImages.push(imageDataUrl);
            const previewItem = document.createElement('div');
            previewItem.className = 'image-preview-item';
            const img = document.createElement('img');
            img.src = imageDataUrl;
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-image-button';
            removeBtn.innerHTML = '&times;';
            removeBtn.onclick = () => {
                attachedImages = attachedImages.filter(url => url !== imageDataUrl);
                previewItem.remove();
                if (attachedImages.length === 0) imagePreviewContainer.classList.add('hidden');
            };
            previewItem.appendChild(img);
            previewItem.appendChild(removeBtn);
            imagePreviewContainer.appendChild(previewItem);
        };
        reader.readAsDataURL(file);
    }
    imageUploadInput.value = '';
});
function showLoader() { topLoader.style.opacity = '1'; topLoader.style.width = '70%'; }
function hideLoader() { topLoader.style.width = '100%'; setTimeout(() => { topLoader.style.opacity = '0'; topLoader.style.width = '0%'; }, 500); }

// =================================================================================
// AI & CHAT LOGIC
// =================================================================================
async function loadOpenRouterModels() {
    const modelSelector = document.getElementById('model-selector');
    try {
        const apiKey = await getApiKey();
        if (!apiKey) { throw new Error("API Key not available"); }
        const response = await fetch("https://openrouter.ai/api/v1/models", { headers: { "Authorization": `Bearer ${apiKey}` } });
        const { data } = await response.json();
        modelSelector.innerHTML = '';
        let visionModelFound = false;
        data.filter(model => model.pricing?.prompt === "0").forEach(model => {
            const option = document.createElement('option');
            option.value = model.id; option.textContent = model.name;
            option.dataset.vision = model.id.includes("vision") || model.id.includes("haiku") || model.id.includes("sonnet") || model.id.includes("opus");
            modelSelector.appendChild(option);
            if (option.dataset.vision === 'true' && !visionModelFound) {
                option.selected = true;
                visionModelFound = true;
            }
        });
        updateInputAbilities();
    } catch (error) {
        console.error("Failed to load models:", error);
        modelSelector.innerHTML = '<option>Error loading models</option>';
    }
    if (modelSelector) modelSelector.addEventListener('change', updateInputAbilities);
}
function updateInputAbilities() {
    const selector = document.getElementById('model-selector');
    if (!selector || selector.options.length === 0) { imageUploadButton.style.display = 'none'; return; }
    const selectedOption = selector.options[selector.selectedIndex];
    const supportsVision = selectedOption?.dataset.vision === 'true';
    imageUploadButton.style.display = 'block';
    imageUploadButton.classList.toggle('highlighted', supportsVision);
    imageUploadButton.title = supportsVision ? "Upload Image (Vision Supported)" : "Upload Image (Vision NOT Supported)";
}
document.getElementById('new-chat-button').addEventListener('click', createNewChat);
function createNewChat() {
    currentChatId = null;
    chatMessages.innerHTML = '';
    addMessageToUI('assistant', { text: 'Hello! How can I help you today?' });
    document.querySelectorAll('#chat-history-list li.active').forEach(li => li.classList.remove('active'));
    if (sidebar.classList.contains('active')) sidebar.classList.remove('active');
    attachedImages = [];
    imagePreviewContainer.innerHTML = '';
    imagePreviewContainer.classList.add('hidden');
}
document.getElementById('send-button').addEventListener('click', sendMessage);
async function sendMessage() {
    const userText = userInput.value.trim();
    if (!userText && attachedImages.length === 0) return;
    const messageContent = { text: userText, imageUrls: [...attachedImages] };
    userInput.value = ''; userInput.style.height = 'auto';
    addMessageToUI('user', messageContent);
    attachedImages = [];
    imagePreviewContainer.innerHTML = '';
    imagePreviewContainer.classList.add('hidden');
    if (!currentChatId) {
        try {
            const title = userText ? (userText.substring(0, 35) + "...") : "Image Query";
            const chatRef = await db.collection('users').doc(currentUser.uid).collection('chats').add({ createdAt: firebase.firestore.FieldValue.serverTimestamp(), title });
            currentChatId = chatRef.id;
            await saveMessageToDb('user', messageContent);
            await loadChatHistory();
            summarizeChatTitle(title);
        } catch (error) { addMessageToUI('assistant', {text: "Sorry, I couldn't start a new chat session."}); return; }
    } else {
        await saveMessageToDb('user', messageContent);
    }
    const messages = await getMessagesForContext();
    streamAiResponse(messages);
}
function showTypingIndicator() {
    if (document.querySelector('.typing-indicator')) return;
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator message-bubble ai-message';
    indicator.innerHTML = '<span></span><span></span><span></span>';
    chatMessages.appendChild(indicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
function hideTypingIndicator() {
    const indicator = document.querySelector('.typing-indicator');
    if (indicator) indicator.remove();
}
async function streamAiResponse(messages) {
    showTypingIndicator();
    const model = document.getElementById('model-selector')?.value;
    const apiKey = await getApiKey();
    if (!apiKey) { hideTypingIndicator(); return; }
    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST", headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model, messages, stream: true })
        });
        hideTypingIndicator();
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData?.error?.message || "An unknown API error occurred.");
        }
        const aiMessageDiv = addMessageToUI('assistant', {text: ''});
        if (!response.body) {
            const full = await response.json();
            const text = full.choices?.[0]?.message?.content || JSON.stringify(full);
            renderAiMessageContent(aiMessageDiv, text);
            await saveMessageToDb('assistant', {text});
            return;
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = "";
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim().startsWith('data:'));
            for (const line of lines) {
                const data = line.substring(6).trim();
                if (data === '[DONE]') break;
                try {
                    const json = JSON.parse(data);
                    const content = json.choices?.[0]?.delta?.content || "";
                    fullResponse += content;
                    renderAiMessageContent(aiMessageDiv, fullResponse);
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                } catch (e) { /* ignore parse errors */ }
            }
        }
        renderAiMessageContent(aiMessageDiv, fullResponse); // Final render
        await saveMessageToDb('assistant', {text: fullResponse});
    } catch (error) {
        hideTypingIndicator();
        addMessageToUI('assistant', {text: `<b>Sorry, an error occurred:</b> ${error.message}`});
    }
}

// =================================================================================
// DATABASE & HISTORY LOGIC
// =================================================================================
async function saveMessageToDb(role, content) {
    if (!currentChatId || !currentUser) return;
    await db.collection('users').doc(currentUser.uid).collection('chats').doc(currentChatId).collection('messages').add({ role, content, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
}
async function loadChatHistory() {
    if (!currentUser) return;
    const historyList = document.getElementById('chat-history-list');
    const snapshot = await db.collection('users').doc(currentUser.uid).collection('chats').orderBy('createdAt', 'desc').get();
    historyList.innerHTML = '';
    snapshot.forEach(doc => {
        const chat = doc.data();
        const li = document.createElement('li');
        li.textContent = chat.title || 'Untitled Chat';
        li.dataset.chatId = doc.id;
        if(doc.id === currentChatId) li.classList.add('active');
        li.addEventListener('click', () => { loadChat(doc.id); if (sidebar.classList.contains('active')) sidebar.classList.remove('active'); });
        historyList.appendChild(li);
    });
}
async function loadChat(chatId) {
    if (currentChatId === chatId && chatMessages.innerHTML !== '' && !chatMessages.querySelector('.typing-indicator')) return;
    speechSynthesis.cancel();
    currentChatId = chatId;
    chatMessages.innerHTML = '';
    document.querySelectorAll('#chat-history-list li').forEach(li => li.classList.toggle('active', li.dataset.chatId === chatId));
    const snapshot = await db.collection('users').doc(currentUser.uid).collection('chats').doc(chatId).collection('messages').orderBy('timestamp').get();
    snapshot.forEach(doc => {
        const messageData = doc.data();
        addMessageToUI(messageData.role, typeof messageData.content === 'string' ? { text: messageData.content } : messageData.content);
    });
}
async function getMessagesForContext() {
    const messages = [];
    if (!currentChatId) return messages;
    const snapshot = await db.collection('users').doc(currentUser.uid).collection('chats').doc(currentChatId).collection('messages').orderBy('timestamp').get();
    snapshot.forEach(doc => {
        const msg = doc.data();
        const contentForApi = [];
        const content = (typeof msg.content === 'string') ? { text: msg.content } : msg.content;
        if (content.imageUrls && Array.isArray(content.imageUrls)) {
            content.imageUrls.forEach(url => contentForApi.push({ type: "image_url", image_url: { "url": url } }));
        }
        if (content.text) contentForApi.push({ type: "text", text: content.text });
        const role = msg.role === 'ai' ? 'assistant' : msg.role;
        if (contentForApi.length > 0) messages.push({ role: role, content: contentForApi });
    });
    return messages;
}
async function summarizeChatTitle(text) {
    const apiKey = await getApiKey();
    if (!currentChatId || !apiKey) return;
    try {
        const messages = [{ role: "user", content: `Summarize the following into a 5-word-or-less title: "${text}"` }];
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST", headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: "openai/gpt-3.5-turbo", messages })
        });
        const { choices } = await response.json();
        const title = choices[0].message.content.replace(/"/g, '').trim();
        await db.collection('users').doc(currentUser.uid).collection('chats').doc(currentChatId).update({ title: title });
        await loadChatHistory();
    } catch (error) { console.error("Error summarizing title:", error); }
}

function addMessageToUI(sender, content) {
    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${sender}-message`;
    if (sender === 'user') {
        let html = '';
        if (content.imageUrls && content.imageUrls.length > 0) {
            html += `<div class="user-images-container">`;
            content.imageUrls.forEach(url => { html += `<img src="${url}" alt="User upload">`; });
            html += `</div>`;
        }
        if (content.text) {
            const p = document.createElement('p');
            p.style.whiteSpace = 'pre-wrap';
            p.textContent = content.text;
            html += p.outerHTML;
        }
        bubble.innerHTML = html;
    } else {
        renderAiMessageContent(bubble, content.text || "");
    }
    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return bubble;
}

function detectExtensionFromCode(codeEl) {
    if (!codeEl) return '.txt';
    const classAttr = codeEl.className || '';
    const match = classAttr.match(/language-(\w+)|lang-(\w+)/i);
    let lang = match ? match[1] || match[2] : null;
    const map = { 'js': '.js', 'javascript': '.js', 'ts': '.ts', 'typescript': '.ts', 'py': '.py', 'python': '.py', 'html': '.html', 'css': '.css', 'json': '.json', 'java': '.java', 'cpp': '.cpp', 'c++': '.cpp', 'php': '.php', 'rb': '.rb', 'ruby': '.rb', 'go': '.go', 'rs': '.rs', 'rust': '.rs', 'sh': '.sh', 'bash': '.sh', 'md': '.md', 'markdown': '.md', 'sql': '.sql', 'yml': '.yml', 'yaml': '.yml' };
    return map[lang] || '.txt';
}

/**
 * REVISED: This function now adds a full toolbar to each code block
 * and keeps the bubble-wide actions at the bottom.
 */
function renderAiMessageContent(bubble, text) {
    // A wrapper for the main content to avoid conflicts with action buttons
    let contentWrapper = bubble.querySelector('.content-wrapper');
    if (!contentWrapper) {
        contentWrapper = document.createElement('div');
        contentWrapper.className = 'content-wrapper';
        bubble.appendChild(contentWrapper);
    }

    // Update the content
    const safeHtml = DOMPurify.sanitize(marked.parse(text || ""));
    contentWrapper.innerHTML = safeHtml;
    
    // Process each code block to add a wrapper and toolbar
    contentWrapper.querySelectorAll('pre').forEach(pre => {
        // If it's already wrapped, skip to avoid duplicates
        if (pre.parentElement.classList.contains('code-block-wrapper')) return;

        // Highlight the code inside
        const codeBlock = pre.querySelector('code');
        if (codeBlock) {
            try { hljs.highlightElement(codeBlock); } catch (e) { /* ignore */ }
        }

        // Create a wrapper for positioning the toolbar
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper';
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);

        // Create the toolbar
        const toolbar = document.createElement('div');
        toolbar.className = 'code-toolbar';

        // 1. Copy Button
        const copyBtn = document.createElement('button');
        copyBtn.type = 'button'; copyBtn.title = 'Copy code';
        copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const textToCopy = codeBlock?.innerText || pre.innerText;
            navigator.clipboard.writeText(textToCopy).then(() => {
                copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied';
                setTimeout(() => { copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy'; }, 1600);
            }).catch(() => alert('Failed to copy.'));
        });

        // 2. Download Button
        const downloadBtn = document.createElement('button');
        downloadBtn.type = 'button'; downloadBtn.title = 'Download code';
        downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download';
        downloadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const textToSave = codeBlock?.innerText || pre.innerText;
            const ext = detectExtensionFromCode(codeBlock);
            const blob = new Blob([textToSave], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `snippet${ext}`;
            a.click();
            URL.revokeObjectURL(url);
        });

        // 3. View/Less Button
        const viewBtn = document.createElement('button');
        viewBtn.type = 'button'; viewBtn.title = 'View more';
        viewBtn.innerHTML = '<i class="fas fa-arrows-alt-v"></i> View';
        viewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            pre.classList.toggle('expanded');
            viewBtn.innerHTML = pre.classList.contains('expanded') ? '<i class="fas fa-compress"></i> Less' : '<i class="fas fa-arrows-alt-v"></i> View';
        });

        toolbar.appendChild(copyBtn);
        toolbar.appendChild(downloadBtn);
        toolbar.appendChild(viewBtn);
        wrapper.appendChild(toolbar); // Add toolbar to the wrapper
    });

    // Add bubble-wide actions if they don't exist
    if (!bubble.querySelector('.bubble-actions')) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'bubble-actions';

        const copyMsgBtn = document.createElement('button');
        copyMsgBtn.className = 'action-btn'; copyMsgBtn.title = 'Copy entire response';
        copyMsgBtn.innerHTML = '<i class="fas fa-copy"></i>';
        copyMsgBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(text).then(() => {
                copyMsgBtn.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => { copyMsgBtn.innerHTML = '<i class="fas fa-copy"></i>'; }, 2000);
            });
        });

        const ttsBtn = document.createElement('button');
        ttsBtn.className = 'action-btn tts-btn'; ttsBtn.title = 'Read aloud';
        ttsBtn.innerHTML = '<i class="fas fa-play"></i>';
        ttsBtn.addEventListener('click', () => handleTtsClick(text, ttsBtn));
        
        actionsDiv.appendChild(copyMsgBtn);
        actionsDiv.appendChild(ttsBtn);
        bubble.appendChild(actionsDiv);
    }
}


// =================================================================================
// SPEECH TO TEXT & TEXT TO SPEECH
// =================================================================================
function handleTtsClick(text, button) {
    speechSynthesis.cancel();
    if (button.classList.contains('tts-playing')) {
        button.innerHTML = '<i class="fas fa-play"></i>';
        button.classList.remove('tts-playing');
        return;
    }
    document.querySelectorAll('.tts-btn.tts-playing').forEach(btn => {
        btn.innerHTML = '<i class="fas fa-play"></i>';
        btn.classList.remove('tts-playing');
    });
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = DOMPurify.sanitize(marked.parse(text));
    tempDiv.querySelectorAll('pre').forEach(pre => pre.textContent = "Code block.");
    const cleanText = tempDiv.textContent || tempDiv.innerText || "";

    currentUtterance = new SpeechSynthesisUtterance(cleanText);
    currentUtterance.onstart = () => { button.innerHTML = '<i class="fas fa-pause"></i>'; button.classList.add('tts-playing'); };
    currentUtterance.onend = () => { button.innerHTML = '<i class="fas fa-play"></i>'; button.classList.remove('tts-playing'); currentUtterance = null; };
    currentUtterance.onerror = () => { button.innerHTML = '<i class="fas fa-play"></i>'; button.classList.remove('tts-playing'); alert("TTS Error"); };
    speechSynthesis.speak(currentUtterance);
}
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;
if (recognition) {
    recognition.continuous = false; recognition.lang = 'en-US';
    recognition.onresult = (event) => { userInput.value += event.results[0][0].transcript; userInput.focus(); };
    recognition.onerror = (event) => { alert(`Speech recognition error: ${event.error}`); };
}
document.getElementById('speech-to-text-button').addEventListener('click', () => {
    if (recognition) { try { recognition.start(); } catch(e) { alert("Cannot start speech recognition."); } }
    else { alert("Sorry, your browser does not support speech recognition."); }
});

// =================================================================================
// MutationObserver & Utilities
// =================================================================================
const chatObserver = new MutationObserver((mutations) => {});
if (chatMessages) chatObserver.observe(chatMessages, { childList: true, subtree: true });

function escapeHtml(unsafe) {
  return unsafe.replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[s] || s);
}