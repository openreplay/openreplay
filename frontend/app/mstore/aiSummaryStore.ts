import { aiService } from 'App/services';
import { makeAutoObservable } from 'mobx';

export default class AiSummaryStore {
  text = '';

  constructor() {
    makeAutoObservable(this);
  }

  setText(text: string) {
    this.text = text;
  }

  appendText(text: string) {
    this.text += text;
  }

  getSummary = async (sessionId: string) => {
    this.setText('');
    const respBody = await aiService.getSummary(sessionId);
    if (!respBody) return;

    const reader = respBody.getReader();

    let lastIncompleteWord = '';

    const processTextChunk = (textChunk: string) => {
      textChunk = lastIncompleteWord + textChunk;
      const words = textChunk.split(' ');

      lastIncompleteWord = words.pop() || '';

      words.forEach((word) => {
        if(word) this.appendText(word + ' ');
      });
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // Process any remaining incomplete word at the end of the stream
          if (lastIncompleteWord) {
            this.appendText(lastIncompleteWord + ' ');
          }
          break;
        }
        const textChunk = new TextDecoder().decode(value, { stream: true });
        console.log(textChunk, done, value)
        processTextChunk(textChunk);
      }
    } catch (error) {
      console.log(error);
    }

    // try {
    //   await new Response(stream).text();
    // } catch (error) {
    //   console.log(error);
    // }

    // while (true) {
    //   const { value, done } = await reader.read();
    //   if (done) break;
    //
    //   const textChunk = decoder.decode(value, { stream: true });
    //   console.log(textChunk)
    //   textChunk.split(" ").forEach(word => {
    //     this.appendText(word + " ");
    //   });
    // }
  };
}
