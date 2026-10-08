import type { Room } from './room.js';

/**
 * Storage seam for rooms. In-memory Map today; swap in Redis later
 * without touching RoomService.
 */
export interface GameRepository {
  save(room: Room): void;
  get(id: string): Room | undefined;
  delete(id: string): boolean;
  all(): IterableIterator<Room>;
  clear(): void;
  get size(): number;
}

export class InMemoryGameRepository implements GameRepository {
  private rooms = new Map<string, Room>();

  save(room: Room): void {
    this.rooms.set(room.id, room);
  }

  get(id: string): Room | undefined {
    return this.rooms.get(id);
  }

  delete(id: string): boolean {
    return this.rooms.delete(id);
  }

  all(): IterableIterator<Room> {
    return this.rooms.values();
  }

  clear(): void {
    this.rooms.clear();
  }

  get size(): number {
    return this.rooms.size;
  }
}
