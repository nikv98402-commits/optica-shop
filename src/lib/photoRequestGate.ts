export class PhotoRequestGate {
  private currentRequestId = 0;

  begin() {
    this.currentRequestId += 1;
    return this.currentRequestId;
  }

  isCurrent(requestId: number) {
    return requestId === this.currentRequestId;
  }

  invalidate() {
    this.currentRequestId += 1;
  }
}
