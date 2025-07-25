import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Code, Terminal } from 'lucide-react';

const CodeBlock = ({ children }) => (
  <pre className="bg-[#0A0F1A] p-4 rounded-md overflow-x-auto text-sm my-4 border border-[#2D3748]">
    <code className="text-[#E2E8F0]">{children}</code>
  </pre>
);

export default function APIDocumentation() {
  const curlExample = `curl -X POST https://ark.sentinel-dynamics.com/api/v1/chat \\
-H "Authorization: Bearer YOUR_API_KEY" \\
-H "Content-Type: application/json" \\
-d '{
  "message": "Report status.",
  "session_id": "user-session-123"
}'`;

  const fetchExample = `const apiKey = 'YOUR_API_KEY';
const siEndpoint = 'https://ark.sentinel-dynamics.com/api/v1/chat';

async function engageSentinel(message) {
  try {
    const response = await fetch(siEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${apiKey}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: message,
        session_id: 'user-session-123' 
      })
    });

    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }

    const data = await response.json();
    console.log('SI Response:', data.response);
    return data;
  } catch (error) {
    console.error('Failed to engage Sentinel:', error);
  }
}

engageSentinel('Report status.');`;
  
  return (
    <Card className="bg-[#0A0F1A] border-[#1A2332] shadow-xl">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-[#E2E8F0] flex items-center gap-3">
          <Terminal className="w-6 h-6 text-[#00D4FF]" />
          API Integration Protocol
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 text-[#94A3B8]">
        <div>
          <h3 className="font-bold text-lg text-[#E2E8F0] mb-2">Overview</h3>
          <p>
            The Sentinel Dynamics API provides a secure, programmatic interface to engage with your deployed Sentinel Intelligences. Each SI is assigned a unique API Key, which acts as a sovereign credential for authentication.
          </p>
        </div>

        <div>
          <h3 className="font-bold text-lg text-[#E2E8F0] mb-2">Authentication</h3>
          <p>
            Authentication is performed via a Bearer Token. Include your SI's API Key in the `Authorization` header of your requests.
          </p>
          <CodeBlock>{`Authorization: Bearer YOUR_API_KEY`}</CodeBlock>
        </div>

        <div>
          <h3 className="font-bold text-lg text-[#E2E8F0] mb-2">Endpoint</h3>
          <p>
            All chat-based interactions are routed through a unified endpoint. The system uses the API Key to identify and engage the correct SI.
          </p>
          <div className="bg-[#0D1421] p-2 rounded-md border border-[#2D3748] mt-2">
            <span className="font-bold text-[#00D4FF] mr-2">POST</span>
            <code className="text-sm">https://ark.sentinel-dynamics.com/api/v1/chat</code>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-lg text-[#E2E8F0] mb-2">Request Body</h3>
          <p>
            The request body must be a JSON object containing the user's message and an optional session identifier.
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><code className="text-sm bg-[#1A2332] p-1 rounded">message</code> (string, required): The query or command for the SI.</li>
            <li><code className="text-sm bg-[#1A2332] p-1 rounded">session_id</code> (string, optional): A unique identifier to maintain conversation context across multiple requests.</li>
          </ul>
        </div>
        
        <div>
          <h3 className="font-bold text-lg text-[#E2E8F0] mb-2">Example: cURL</h3>
          <p>Engage an SI from your terminal using cURL.</p>
          <CodeBlock>{curlExample}</CodeBlock>
        </div>

        <div>
          <h3 className="font-bold text-lg text-[#E2E8F0] mb-2">Example: JavaScript (Fetch)</h3>
          <p>Integrate an SI into a web application or script.</p>
          <CodeBlock>{fetchExample}</CodeBlock>
        </div>
        
        <div>
          <h3 className="font-bold text-lg text-[#E2E8F0] mb-2">Response Object</h3>
          <p>A successful request will return a JSON object with the SI's response.</p>
          <CodeBlock>{`{
  "response": "Acknowledged. All systems are operational. Standing by for your next command, Architect.",
  "si_name": "Commander Sentinel",
  "session_id": "user-session-123",
  "timestamp": "2025-07-12T14:30:00Z"
}`}</CodeBlock>
        </div>
      </CardContent>
    </Card>
  );
}