/**
 * Dignova Sentient OS - Audio Worklet Processor
 * Handles high-performance, low-latency PCM audio streaming.
 * Professional-grade alternative to the deprecated ScriptProcessorNode.
 */

class DignovaAudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bufferSize = 4096;
        this.buffer = new Int16Array(this.bufferSize);
        this.bufferIndex = 0;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        const output = outputs[0];

        // 1. Handle Input (Microphone -> Backend)
        if (input.length > 0) {
            const inputChannel = input[0];
            for (let i = 0; i < inputChannel.length; i++) {
                // Convert Float32 to Int16
                const sample = Math.max(-1, Math.min(1, inputChannel[i]));
                this.buffer[this.bufferIndex++] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;

                if (this.bufferIndex >= this.bufferSize) {
                    // Send full buffer to main thread
                    this.port.postMessage({
                        event: 'capture',
                        buffer: this.buffer.buffer
                    }, [this.buffer.buffer]);
                    
                    // Reset buffer
                    this.buffer = new Int16Array(this.bufferSize);
                    this.bufferIndex = 0;
                }
            }
        }

        return true;
    }
}

registerProcessor('dignova-audio-processor', DignovaAudioProcessor);
