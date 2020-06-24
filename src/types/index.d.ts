declare module 'cache-content-type' {
  export default function(filenameOrExt: string): string | false;
}

declare module 'only' {
  export default function(obj: object, keys: string | string[]): object;
}
