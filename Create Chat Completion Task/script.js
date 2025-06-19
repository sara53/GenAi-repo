// Replace 'YOUR_OPENAI_API_KEY' with your actual OpenAI API key
const OPENAI_API_KEY = "your Secret Key";
const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");

function addMessage(messageData, sender) {
	const msgDiv = document.createElement("div");
	msgDiv.className = `message ${sender}`;
	// Add avatar and bubble
	const avatar = document.createElement("div");
	avatar.className = "avatar";
	avatar.textContent = sender === "user" ? "🧑" : "🤖";
	const bubble = document.createElement("div");
	bubble.className = "bubble";

	if (
		sender === "assistant" &&
		typeof messageData === "object" &&
		messageData !== null &&
		messageData.content
	) {
		// Split content into steps (by numbered list or newlines)
		let steps = messageData.content
			.split(/\n+/)
			.filter((line) => line.trim().length > 0)
			.map((line) => line.replace(/^\d+\.|^- /, "").trim());
		if (steps.length === 1) {
			// fallback: try splitting by sentences if no steps
			steps = messageData.content.split(/(?<=[.!?])\s+/);
		}
		bubble.innerHTML =
			`<strong style='font-size:1.1em; color:#3a7bd5;'>Step-by-step Answer:</strong><ul style='margin-top:0.5em;'>` +
			steps.map((step) => `<li>${step}</li>`).join("") +
			`</ul>`;
	} else {
		bubble.textContent = messageData;
	}

	if (sender === "user") {
		msgDiv.appendChild(bubble);
		msgDiv.appendChild(avatar);
	} else {
		msgDiv.appendChild(avatar);
		msgDiv.appendChild(bubble);
	}
	chatWindow.appendChild(msgDiv);
	chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Handle model selection
document
	.getElementById("model-select")
	.addEventListener("change", function (e) {
		window.selectedModel = e.target.value;
	});
window.selectedModel = document.getElementById("model-select").value;

// Handle image upload
const imageUploadInput = document.getElementById("image-upload");
imageUploadInput.addEventListener("change", async function (e) {
	const file = e.target.files[0];
	if (file) {
		// Show image preview in chat
		const reader = new FileReader();
		reader.onload = function (evt) {
			const img = document.createElement("img");
			img.src = evt.target.result;
			img.alt = file.name;
			img.style.maxWidth = "180px";
			img.style.borderRadius = "12px";
			img.style.margin = "8px 0";
			const msgDiv = document.createElement("div");
			msgDiv.className = "message user";
			const avatar = document.createElement("div");
			avatar.className = "avatar";
			avatar.textContent = "🧑";
			const bubble = document.createElement("div");
			bubble.className = "bubble";
			bubble.appendChild(img);
			msgDiv.appendChild(bubble);
			msgDiv.appendChild(avatar);
			chatWindow.appendChild(msgDiv);
			chatWindow.scrollTop = chatWindow.scrollHeight;
		};
		reader.readAsDataURL(file);

		// Send image to OpenAI Vision API
		addMessage("Analyzing image...", "assistant");
		try {
			// Convert image to base64
			const base64 = await new Promise((resolve, reject) => {
				const fr = new FileReader();
				fr.onload = () => resolve(fr.result.split(",")[1]);
				fr.onerror = reject;
				fr.readAsDataURL(file);
			});
			// Use gpt-4-vision-preview or gpt-4o
			const model =
				window.selectedModel && window.selectedModel.startsWith("gpt-4")
					? window.selectedModel
					: "gpt-4o";
			const response = await fetch(
				"https://api.openai.com/v1/chat/completions",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${OPENAI_API_KEY}`,
					},
					body: JSON.stringify({
						model: model,
						messages: [
							{
								role: "system",
								content:
									"You are a helpful assistant. Describe the image and answer any question about it.",
							},
							{
								role: "user",
								content: [
									{ type: "text", text: "What do you see in this image?" },
									{
										type: "image_url",
										image_url: { url: `data:${file.type};base64,${base64}` },
									},
								],
							},
						],
						max_tokens: 800,
					}),
				}
			);
			const data = await response.json();
			chatWindow.removeChild(chatWindow.lastChild); // Remove loading
			if (data.choices && data.choices[0] && data.choices[0].message) {
				addMessage(data.choices[0].message.content.trim(), "assistant");
				window.chatHistory.push({
					role: "user",
					content: "[Image uploaded: " + file.name + "]",
				});
				window.chatHistory.push({
					role: "assistant",
					content: data.choices[0].message.content.trim(),
				});
			} else {
				addMessage("Sorry, image analysis failed.", "assistant");
			}
		} catch (err) {
			chatWindow.removeChild(chatWindow.lastChild);
			addMessage("Error: " + err.message, "assistant");
		}
	}
});

// Handle audio upload
document
	.getElementById("audio-upload")
	.addEventListener("change", function (e) {
		const file = e.target.files[0];
		if (file) {
			addMessage("[Audio upload: " + file.name + "]", "user");
		}
	});

// Update sendMessageToOpenAI to use selected model
async function sendMessageToOpenAI(message) {
	addMessage("...", "assistant"); // Loading indicator
	try {
		const response = await fetch("https://api.openai.com/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${OPENAI_API_KEY}`,
			},
			body: JSON.stringify({
				model: window.selectedModel || "gpt-4o-mini",
				messages: [
					{
						role: "system",
						content:
							"You are a helpful assistant. Always answer questions step-by-step as a list of logical steps to reach the final answer.",
					},
					...window.chatHistory,
					{ role: "user", content: message },
				],
			}),
		});
		const data = await response.json();
		console.log("Data ", data);
		// Remove loading indicator
		chatWindow.removeChild(chatWindow.lastChild);
		if (data.choices && data.choices[0] && data.choices[0].message) {
			const structuredResponse = {
				role: data.choices[0].message.role,
				content: data.choices[0].message.content.trim(),
				finish_reason: data.choices[0].finish_reason,
				model: data.model || window.selectedModel || "gpt-4o-mini",
			};
			addMessage(structuredResponse, "assistant");
			window.chatHistory.push({ role: "user", content: message });
			window.chatHistory.push({
				role: "assistant",
				content: data.choices[0].message.content.trim(),
			});
		} else {
			addMessage("Sorry, something went wrong.", "assistant");
		}
	} catch (err) {
		chatWindow.removeChild(chatWindow.lastChild);
		addMessage("Error: " + err.message, "assistant");
	}
}

// Add user message to sidebar
function addUserMessageToSidebar(message) {
	const sidebar = document.querySelector(".sidebar-creative .list-group");
	if (!sidebar) return;
	const msgText = message.length > 30 ? message.slice(0, 30) + "..." : message;
	const item = document.createElement("a");
	item.href = "#";
	item.className =
		"list-group-item list-group-item-action rounded mb-1 sidebar-list-item";
	item.innerHTML = `<i class="bi bi-person me-2"></i>${msgText}`;
	sidebar.appendChild(item);
}

// Chat history management
let allChats = [];
let currentChatIndex = 0;

function saveCurrentChatToSidebar() {
	const sidebar = document.getElementById("chat-list");
	if (!sidebar) return;
	const chat = window.chatHistory || [];
	if (chat.length === 0) return;
	const firstUserMsg = chat.find((m) => m.role === "user");
	const title = firstUserMsg
		? firstUserMsg.content.length > 20
			? firstUserMsg.content.slice(0, 20) + "..."
			: firstUserMsg.content
		: "New Chat";
	const item = document.createElement("a");
	item.href = "#";
	item.className =
		"list-group-item list-group-item-action rounded mb-1 sidebar-list-item d-flex justify-content-between align-items-center";
	item.innerHTML = `<span><i class="bi bi-chat-left-text me-2"></i>${title}</span><span class="delete-chat text-danger ms-2" title="Delete"><i class="bi bi-trash"></i></span>`;
	item.dataset.chatIndex = allChats.length;
	item.addEventListener("click", function (e) {
		if (e.target.closest(".delete-chat")) return; // Don't load chat if delete clicked
		loadChatByIndex(Number(item.dataset.chatIndex));
	});
	item.querySelector(".delete-chat").addEventListener("click", function (e) {
		e.stopPropagation();
		allChats.splice(Number(item.dataset.chatIndex), 1);
		item.remove();
		// Optionally, clear chat window if this was the current chat
	});
	sidebar.appendChild(item);
}

function loadChatByIndex(idx) {
	if (allChats[idx]) {
		window.chatHistory = JSON.parse(JSON.stringify(allChats[idx]));
		currentChatIndex = idx;
		chatWindow.innerHTML = "";
		for (const msg of window.chatHistory) {
			addMessage(msg.content, msg.role);
		}
	}
}

function startNewChat() {
	if (window.chatHistory && window.chatHistory.length > 0) {
		allChats.push(JSON.parse(JSON.stringify(window.chatHistory)));
		saveCurrentChatToSidebar();
	}
	window.chatHistory = [];
	currentChatIndex = allChats.length;
	chatWindow.innerHTML = "";
}

// Attach to New Chat button
const newChatBtn = document.querySelector(".btn.btn-primary.m-3");
if (newChatBtn) {
	newChatBtn.addEventListener("click", startNewChat);
}

window.chatHistory = [];

chatForm.addEventListener("submit", function (e) {
	e.preventDefault();
	const message = userInput.value.trim();
	if (!message) return;
	addMessage(message, "user");
	addUserMessageToSidebar(message);
	userInput.value = "";
	sendMessageToOpenAI(message);
});
