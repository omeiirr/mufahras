// Main-thread side of the search worker. Only the response to the latest query is delivered;
// answers to queries typed over are dropped. Detail requests resolve independently.
import type { Detail, DetailRequest } from '../data/views';
import type { SearchOptions, SearchResponse } from './types';
import type { LoadStatus, OfflineStatus, WorkerRequest, WorkerResponse } from './worker';

export class SearchClient {
  private worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  private searchId = 0;
  private detailId = 0;
  private pending = new Map<number, (d: Detail | null) => void>();
  private pendingOffline = new Map<number, (s: OfflineStatus) => void>();

  constructor(
    dataBase: string,
    private onResults: (r: SearchResponse) => void,
    private onStatus: (s: LoadStatus) => void,
  ) {
    this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data;
      if (msg.type === 'status') this.onStatus(msg.status);
      else if (msg.type === 'results') {
        if (msg.id === this.searchId) this.onResults(msg.response);
      } else if (msg.type === 'offline') {
        this.pendingOffline.get(msg.id)?.(msg.offline);
        this.pendingOffline.delete(msg.id);
      } else {
        this.pending.get(msg.id)?.(msg.detail);
        this.pending.delete(msg.id);
      }
    };
    this.send({ type: 'init', base: dataBase });
  }

  search(query: string, opts: SearchOptions = {}): void {
    this.send({ type: 'search', id: ++this.searchId, query, opts });
  }

  detail(req: DetailRequest): Promise<Detail | null> {
    const id = ++this.detailId;
    return new Promise((resolve) => {
      this.pending.set(id, resolve);
      this.send({ type: 'detail', id, req });
    });
  }

  /** What's stored for offline use; with download, first fetches whatever is missing. */
  offline(download = false): Promise<OfflineStatus> {
    const id = ++this.detailId;
    return new Promise((resolve) => {
      this.pendingOffline.set(id, resolve);
      this.send({ type: 'offline', id, download });
    });
  }

  private send(msg: WorkerRequest): void {
    this.worker.postMessage(msg);
  }
}
