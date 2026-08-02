export class MissionRuntime {
  cancel(reason: string) {
    return this.cleanup(reason);
  }

  private cleanup(reason: string) {
    return `cleaned:${reason}`;
  }
}
