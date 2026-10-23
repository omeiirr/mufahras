// Main-thread side of the search worker. Only the response to the latest query is delivered;
// answers to queries typed over are dropped.
import type { SearchOptions, SearchResponse } from './types';
import type { LoadStatus, WorkerRequest, WorkerResponse } from './worker';

export class SearchClient {
  private worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  private nextId = 0;

  constructor(
    dataBase: string,
    private onResults: (r: SearchResponse) => void,
    private onStatus: (s: LoadStatus) => void,
  ) {
    this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data;
      if (msg.type === 'status') this.onStatus(msg.status);
      else if (msg.id === this.nextId) this.onResults(msg.response);
    };
    this.send({ type: 'init', base: dataBase });
  }

  search(query: string, opts: SearchOptions = {}): void {
    this.send({ type: 'search', id: ++this.nextId, query, opts });
  }

  private send(msg: WorkerRequest): void {
    this.worker.postMessage(msg);
  }
}
