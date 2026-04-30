export interface MCPRequest {
	jsonrpc: string;
	id: any;
	method: string;
	params?: any;
}

export interface MCPResponse {
	jsonrpc: string;
	id: any;
	result?: any;
	error?: {
		code: number;
		message: string;
	};
}
