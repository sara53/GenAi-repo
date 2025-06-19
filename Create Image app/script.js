// WARNING: This is UNSAFE for production. Do not expose your API key in real apps.
const OPENAI_API_KEY = "your secret key";
async function generateImage(prompt) {
	const response = await fetch("https://api.openai.com/v1/images/generations", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${OPENAI_API_KEY}`,
		},
		body: JSON.stringify({
			model: "dall-e-3",
			prompt: prompt,
			n: 1,
			size: "1024x1024",
		}),
	});
	const data = await response.json();
	if (data.data && data.data[0] && data.data[0].url) {
		return data.data[0].url;
	} else {
		throw new Error("Image generation failed");
	}
}

// Enhanced chat UI logic with icons and better message design

document.addEventListener("DOMContentLoaded", () => {
	const chat = document.getElementById("chat");
	const form = document.getElementById("promptForm");
	const input = document.getElementById("promptInput");

	function appendUserMessage(message) {
		chat.innerHTML += `
			<div class="d-flex align-items-start mb-3">
				<div class="me-2">
					<span class="user-icon bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style="width:40px;height:40px;font-size:1.5rem;">👤</span>
				</div>
				<div>
					<div class="user-message p-3 rounded-3 bg-primary text-white shadow-sm">${message}</div>
				</div>
			</div>
		`;
	}

	function appendBotMessage(content, isImage = false) {
		chat.innerHTML += `
			<div class="d-flex align-items-start mb-3 flex-row-reverse">
				<div class="ms-2">
					<span class="bot-icon bg-success text-white rounded-circle d-flex align-items-center justify-content-center" style="width:40px;height:40px;font-size:1.5rem;">🤖</span>
				</div>
				<div>
					<div class="bot-message p-3 rounded-3 bg-success text-white shadow-sm">
						${
							isImage
								? `<img src="${content}" alt="Generated image" class="img-fluid rounded-4 shadow">`
								: content
						}
					</div>
				</div>
			</div>
		`;
	}

	form.addEventListener("submit", async (e) => {
		e.preventDefault();
		const prompt = input.value;
		appendUserMessage(prompt);
		appendBotMessage("Generating image...");
		try {
			const imageUrl = await generateImage(prompt);
			// Remove the last bot message ("Generating image...")
			chat.lastChild.remove();
			appendBotMessage(imageUrl, true);
		} catch (err) {
			chat.lastChild.remove();
			appendBotMessage(`Error: ${err.message}`);
		}
		input.value = "";
		chat.scrollTop = chat.scrollHeight;
	});
});
