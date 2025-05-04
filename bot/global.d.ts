declare global {
  interface EngineCoupVotes {
    yes: number;
    no: number;
    voters: Set<string>;
  }
  var engineCoupVotes: EngineCoupVotes;
}
export {};
