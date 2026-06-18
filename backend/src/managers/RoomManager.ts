import { User } from "./UserManager";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";


let globalId = 1;


export interface Room {
    user1: User,
    user2: User,
}

export class RoomManager {

    private rooms: Map<string, Room>;

    constructor() {
        this.rooms = new Map<string, Room>();
    }

    createRoom(user1: User, user2: User) {
        const roomId = this.generateRoomId().toString();
        this.rooms.set(roomId, {
            user1,
            user2
        });
        console.log(`Room created with ID: ${roomId}, User1: ${user1.name}, User2: ${user2.name}`);

        user1.socket.emit("send-offer", {
            roomId
        });

        void this.sendConversationSuggestions(user1, user2, roomId);
    }


    private async sendConversationSuggestions(user1: User, user2: User, roomId: string) {
        const interests1 = user1.interests || [];
        const interests2 = user2.interests || [];

        const sharedInterests = interests1.filter((interest) => 
            interests2.some(i => i.toLowerCase() === interest.toLowerCase())
        );

        const suggestions = await this.generateConversationSuggestions(interests1, interests2);
        if (suggestions.length === 0) {
            return;
        }

        const user1Payload = {
            roomId,
            sharedInterests,
            suggestions: suggestions.slice(0, 4)
        };

        const user2Payload = {
            roomId,
            sharedInterests,
            suggestions: suggestions.slice(4, 8)
        };
        user1.socket.emit("conversation-suggestions", user1Payload);
        user2.socket.emit("conversation-suggestions", user2Payload);
    }

    private async generateConversationSuggestions(interests1: string[], interests2: string[]): Promise<string[]> {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const geminiClient = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;
    if (!geminiClient) {
        console.log("⚠️ No Gemini API key found. Returning empty array.");
        return [];
    }

    try { 
        const model = geminiClient.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = [
                "You create friendly, short conversation starters for two strangers in a video chat.",
                "Keep prompts positive and funny, u can add jokes too.",
                "Return exactly 8 concise questions, one per line, without numbering, bullets, or quotation marks.",
                "",
                "CRITICAL INSTRUCTION ON GIBBERISH/NONSENSE:",
                "If an interest is a keyboard smash, pure gibberish, numbers, or a repeated letter (e.g., 'aaaaa', 'asdf', 'xyz', '123'), you MUST completely ignore it.",
                "NEVER include the literal gibberish text (like 'aaaaa') inside any question.",
                "",
                "EXAMPLES OF HANDLING GIBBERISH:",
                "- If Interest is 'aaaaa', treat it as blank and ask a completely random fun question like: 'What is your go-to comfort food?'",
                "- If Interest is 'asdf', treat it as blank and ask a completely random fun question like: 'If you could",
                "",
                `Lines 1-4 must be questions for User A to ask User B specifically about User B's interests: ${interests2.join(", ") || "their hobbies"}. If User B's interest is gibberish or a repeated letter, make these 4 lines fun, completely random, generic icebreakers instead.`,
                `Lines 5-8 must be questions for User B to ask User A specifically about User A's interests: ${interests1.join(", ") || "their hobbies"}. If User A's interest is gibberish or a repeated letter, make these 4 lines fun, completely random, generic icebreakers instead.`
            ].join("\n");

        const response = await model.generateContent(prompt);
        const generatedText = response.response.text();

        // KEEPING LOGS AS REQUESTED
        console.log("=== GEMINI RAW RESPONSE ===");
        console.log(generatedText);
        console.log("===========================");

        // Clean up lines, removing numbers, bullets, and surrounding quotation marks
        const suggestions = generatedText
            .split("\n")
            .map((line) => line.trim().replace(/^[-*\d.)\s]+/, "").replace(/^["']|["']$/g, ""))
            .filter(Boolean);

        // Ensure we actually got a complete 8-item array before returning it, else return empty
        return suggestions.length >= 8 ? suggestions.slice(0, 8) : [];
    } catch (error) {
        console.error("Failed to fetch Gemini conversation suggestions", error);
        return [];
    }
}


    onOffer(roomId: string, sdp: string, senderSocketId: string) {
        const room = this.rooms.get(roomId);
        if (!room) {
            console.error(`Room not found for roomId: ${roomId}`);
            return;
        }
        const receivingUser = room.user1.socket.id === senderSocketId ? room.user2 : room.user1;        
        receivingUser?.socket.emit("offer", {
            sdp,
            roomId
        });
    }

    onAnswer(roomId: string, sdp: string, senderSocketId:string) {
        const room = this.rooms.get(roomId);
        if (!room) {
            console.error(`Room not found for roomId: ${roomId}`);
            return;
        }
        const receivingUser = room.user1.socket.id === senderSocketId ? room.user2 : room.user1;        
        
        receivingUser?.socket.emit("answer", {
            sdp,
            roomId
        });
    }

    onIceCandidates(roomId : string , senderSocketId : string , candidate : any, type : "sender" | "receiver"){
        const room = this.rooms.get(roomId);
        if(!room){
            console.log("room not found in incecandiates");
            return;
        }
        const receivingUser = room.user1.socket.id === senderSocketId ? room.user2 : room.user1;
        receivingUser.socket.emit("add-ice-candidate", {candidate, type});
    }

    generateRoomId() {
        return globalId++;
    }
}

