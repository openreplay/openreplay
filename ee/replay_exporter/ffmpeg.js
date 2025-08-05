import { execa } from 'execa';
import ffmpegPath from 'ffmpeg-static';

export async function cutHead(input, output, seconds) {
  const fullPoint = Math.round(seconds)
  console.log('>>>> trimming from', seconds)
  await execa(ffmpegPath, [
      '-hide_banner', '-loglevel', 'error',
      '-i', input,
      '-ss', fullPoint.toString(),
      '-c:v', 'libvpx-vp9',      // or libx264 / h264_nvenc …
      '-crf', '32', '-b:v', '0', // VP9 quality 32 ≈ Playwright default
      output,
    ]);
  console.log(`>>>> Trimmed in ${output}`);
}
