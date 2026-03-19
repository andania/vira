/**
 * Room Slice
 * Manages rooms and live streaming state
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { roomApi } from '../../services/api/room.api';

interface Room {
  id: string;
  name: string;
  description?: string;
  roomType: string;
  status: string;
  visibility: string;
  participantCount: number;
  maxParticipants?: number;
  brandId: string;
  brandName?: string;
  host?: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
  scheduledStart?: string;
  scheduledEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  settings?: any;
  createdAt: string;
}

interface Participant {
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  role: 'host' | 'moderator' | 'viewer';
  joinedAt: string;
}

interface Message {
  id: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  content: string;
  mentions?: string[];
  repliedTo?: string;
  createdAt: string;
}

interface Stream {
  streamId: string;
  status: 'idle' | 'connecting' | 'live' | 'ended';
  viewerCount: number;
  quality?: string;
  startedAt?: string;
  playbackUrl?: string;
}

interface RoomState {
  rooms: Room[];
  currentRoom: Room | null;
  participants: Participant[];
  messages: Message[];
  stream: Stream | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

const initialState: RoomState = {
  rooms: [],
  currentRoom: null,
  participants: [],
  messages: [],
  stream: null,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    hasMore: false,
  },
};

// Async thunks
export const fetchRooms = createAsyncThunk(
  'room/fetchRooms',
  async ({ brandId, page = 1, limit = 20, status }: { brandId?: string; page?: number; limit?: number; status?: string }) => {
    const response = await roomApi.getRooms(brandId, page, limit, status);
    return response.data;
  }
);

export const fetchLiveRooms = createAsyncThunk(
  'room/fetchLiveRooms',
  async (limit?: number) => {
    const response = await roomApi.getLiveRooms(limit);
    return response.data;
  }
);

export const fetchUpcomingRooms = createAsyncThunk(
  'room/fetchUpcomingRooms',
  async ({ days, limit }: { days?: number; limit?: number }) => {
    const response = await roomApi.getUpcomingRooms(days, limit);
    return response.data;
  }
);

export const fetchRoomById = createAsyncThunk(
  'room/fetchRoomById',
  async (roomId: string) => {
    const response = await roomApi.getRoomById(roomId);
    return response.data;
  }
);

export const createRoom = createAsyncThunk(
  'room/createRoom',
  async (roomData: any) => {
    const response = await roomApi.createRoom(roomData);
    return response.data;
  }
);

export const updateRoom = createAsyncThunk(
  'room/updateRoom',
  async ({ roomId, data }: { roomId: string; data: any }) => {
    const response = await roomApi.updateRoom(roomId, data);
    return response.data;
  }
);

export const deleteRoom = createAsyncThunk(
  'room/deleteRoom',
  async (roomId: string) => {
    await roomApi.deleteRoom(roomId);
    return roomId;
  }
);

export const startRoom = createAsyncThunk(
  'room/startRoom',
  async (roomId: string) => {
    const response = await roomApi.startRoom(roomId);
    return response.data;
  }
);

export const endRoom = createAsyncThunk(
  'room/endRoom',
  async (roomId: string) => {
    const response = await roomApi.endRoom(roomId);
    return response.data;
  }
);

export const joinRoom = createAsyncThunk(
  'room/joinRoom',
  async ({ roomId, metadata }: { roomId: string; metadata?: any }) => {
    const response = await roomApi.joinRoom(roomId, metadata);
    return response.data;
  }
);

export const leaveRoom = createAsyncThunk(
  'room/leaveRoom',
  async (roomId: string) => {
    await roomApi.leaveRoom(roomId);
    return roomId;
  }
);

export const fetchParticipants = createAsyncThunk(
  'room/fetchParticipants',
  async (roomId: string) => {
    const response = await roomApi.getParticipants(roomId);
    return response.data;
  }
);

export const fetchMessages = createAsyncThunk(
  'room/fetchMessages',
  async ({ roomId, limit, before }: { roomId: string; limit?: number; before?: string }) => {
    const response = await roomApi.getMessages(roomId, limit, before);
    return response.data;
  }
);

export const sendMessage = createAsyncThunk(
  'room/sendMessage',
  async ({ roomId, content, mentions }: { roomId: string; content: string; mentions?: string[] }) => {
    const response = await roomApi.sendMessage(roomId, content, mentions);
    return response.data;
  }
);

export const startStream = createAsyncThunk(
  'room/startStream',
  async ({ roomId, quality }: { roomId: string; quality?: string }) => {
    const response = await roomApi.startStream(roomId, quality);
    return response.data;
  }
);

export const endStream = createAsyncThunk(
  'room/endStream',
  async (streamId: string) => {
    await roomApi.endStream(streamId);
    return streamId;
  }
);

export const getStreamInfo = createAsyncThunk(
  'room/getStreamInfo',
  async (streamId: string) => {
    const response = await roomApi.getStreamInfo(streamId);
    return response.data;
  }
);

const roomSlice = createSlice({
  name: 'room',
  initialState,
  reducers: {
    clearCurrentRoom: (state) => {
      state.currentRoom = null;
      state.participants = [];
      state.messages = [];
      state.stream = null;
    },
    addMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload);
    },
    updateParticipantCount: (state, action: PayloadAction<number>) => {
      if (state.currentRoom) {
        state.currentRoom.participantCount = action.payload;
      }
    },
    updateStreamStatus: (state, action: PayloadAction<Partial<Stream>>) => {
      if (state.stream) {
        state.stream = { ...state.stream, ...action.payload };
      }
    },
    resetRoomPagination: (state) => {
      state.pagination = initialState.pagination;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch rooms
      .addCase(fetchRooms.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRooms.fulfilled, (state, action) => {
        state.isLoading = false;
        state.rooms = action.payload.rooms;
        state.pagination = {
          page: action.payload.page,
          limit: action.payload.limit,
          total: action.payload.total,
          hasMore: action.payload.hasMore,
        };
      })
      .addCase(fetchRooms.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch rooms';
      })

      // Fetch live rooms
      .addCase(fetchLiveRooms.fulfilled, (state, action) => {
        state.rooms = action.payload;
      })

      // Fetch upcoming rooms
      .addCase(fetchUpcomingRooms.fulfilled, (state, action) => {
        // Could merge or replace based on requirements
      })

      // Fetch room by ID
      .addCase(fetchRoomById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRoomById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentRoom = action.payload;
      })
      .addCase(fetchRoomById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch room';
      })

      // Create room
      .addCase(createRoom.fulfilled, (state, action) => {
        state.rooms.unshift(action.payload);
      })

      // Update room
      .addCase(updateRoom.fulfilled, (state, action) => {
        const index = state.rooms.findIndex(r => r.id === action.payload.id);
        if (index !== -1) {
          state.rooms[index] = action.payload;
        }
        if (state.currentRoom?.id === action.payload.id) {
          state.currentRoom = action.payload;
        }
      })

      // Delete room
      .addCase(deleteRoom.fulfilled, (state, action) => {
        state.rooms = state.rooms.filter(r => r.id !== action.payload);
        if (state.currentRoom?.id === action.payload) {
          state.currentRoom = null;
        }
      })

      // Start room
      .addCase(startRoom.fulfilled, (state, action) => {
        const index = state.rooms.findIndex(r => r.id === action.payload.id);
        if (index !== -1) {
          state.rooms[index] = action.payload;
        }
        if (state.currentRoom?.id === action.payload.id) {
          state.currentRoom = action.payload;
        }
      })

      // End room
      .addCase(endRoom.fulfilled, (state, action) => {
        const index = state.rooms.findIndex(r => r.id === action.payload.id);
        if (index !== -1) {
          state.rooms[index] = action.payload;
        }
        if (state.currentRoom?.id === action.payload.id) {
          state.currentRoom = action.payload;
        }
      })

      // Join room
      .addCase(joinRoom.fulfilled, (state, action) => {
        if (state.currentRoom) {
          state.currentRoom.participantCount += 1;
        }
      })

      // Leave room
      .addCase(leaveRoom.fulfilled, (state, action) => {
        if (state.currentRoom) {
          state.currentRoom.participantCount -= 1;
        }
      })

      // Fetch participants
      .addCase(fetchParticipants.fulfilled, (state, action) => {
        state.participants = action.payload;
      })

      // Fetch messages
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.messages = action.payload.messages;
      })

      // Send message
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.messages.push(action.payload);
      })

      // Start stream
      .addCase(startStream.fulfilled, (state, action) => {
        state.stream = action.payload;
        if (state.currentRoom) {
          state.currentRoom.status = 'live';
        }
      })

      // End stream
      .addCase(endStream.fulfilled, (state, action) => {
        if (state.stream?.streamId === action.payload) {
          state.stream = null;
        }
        if (state.currentRoom) {
          state.currentRoom.status = 'ended';
        }
      })

      // Get stream info
      .addCase(getStreamInfo.fulfilled, (state, action) => {
        state.stream = action.payload;
      });
  },
});

export const { 
  clearCurrentRoom, 
  addMessage, 
  updateParticipantCount, 
  updateStreamStatus,
  resetRoomPagination 
} = roomSlice.actions;

export default roomSlice.reducer;