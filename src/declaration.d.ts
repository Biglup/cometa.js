declare module '*.wasm' {
  const value: any;
  export default value;
}

// Define the FinalizationRegistry entry type
interface FinalizationRegistryEntry {
  ptr: number | null; // Pointer, nullable
  freeFunc: (ptr: number) => void; // Function to free the memory
}