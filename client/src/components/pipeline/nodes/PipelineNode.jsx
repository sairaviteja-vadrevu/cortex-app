import { PromptNode } from "./PromptNode";
import { ImageInputNode } from "./ImageInputNode";
import { ProcessNode } from "./ProcessNode";
import { VideoProcessNode } from "./VideoProcessNode";
import { VideoMergeNode } from "./VideoMergeNode";
import { VideoAudioMergeNode } from "./VideoAudioMergeNode";
import { OutputNode } from "./OutputNode";

export function PipelineNode({ node, onDragStart }) {
  switch (node.nodeType) {
    case "prompt": return <PromptNode node={node} onDragStart={onDragStart} />;
    case "imageInput": return <ImageInputNode node={node} onDragStart={onDragStart} />;
    case "process": return <ProcessNode node={node} onDragStart={onDragStart} />;
    case "videoProcess": return <VideoProcessNode node={node} onDragStart={onDragStart} />;
    case "videoMerge": return <VideoMergeNode node={node} onDragStart={onDragStart} />;
    case "videoAudioMerge": return <VideoAudioMergeNode node={node} onDragStart={onDragStart} />;
    case "output": return <OutputNode node={node} onDragStart={onDragStart} />;
    default: return null;
  }
}
