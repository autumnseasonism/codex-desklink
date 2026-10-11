import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {z} from 'zod';
const server=new McpServer({name:'fake-desktop',version:'1'});
server.registerTool('read_thread',{inputSchema:{threadId:z.string(),turnLimit:z.number(),includeOutputs:z.boolean(),maxOutputCharsPerItem:z.number()}},async({threadId})=>({content:[{type:'text',text:JSON.stringify({thread:{id:threadId,status:{type:'idle'}},page:{hasMore:false},turns:[],inheritedThreadEnv:!!process.env.CODEX_THREAD_ID})}]}));
server.registerTool('send_message_to_thread',{inputSchema:{threadId:z.string(),prompt:z.string()}},async({threadId})=>({content:[{type:'text',text:JSON.stringify({threadId})}]}));
await server.connect(new StdioServerTransport());
