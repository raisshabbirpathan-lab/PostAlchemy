async function generate(type) {
    const inputText = document.getElementById('inputText').value;
    const outputBox = document.getElementById('output');

    if (!inputText.trim()) {
        outputBox.innerText = "⚠️ Please enter some text first.";
        return;
    }

    outputBox.innerText = "⏳ Generating your " + type + " post... Please wait.";

    try {
        // Vercel serverless function ko call karna
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: inputText,
                type: type
            })
        });

        const data = await response.json();

        if (!response.ok) {
            outputBox.innerText = "❌ Error: " + (data.error || "Something went wrong.");
        } else {
            outputBox.innerText = data.text;
        }
    } catch (error) {
        outputBox.innerText = "❌ Connection Error: Could not reach the server. Please check your internet or Vercel deployment.";
        console.error(error);
    }
}
