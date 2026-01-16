"use client"

import { useMemo } from "react"
import { getFileIconByExtension } from "./agents-file-mention"
import { FilesIcon, SkillIcon, AgentIcon } from "../../../components/ui/icons"
import { MENTION_PREFIXES } from "./agents-mentions-editor"

// Custom folder icon matching design
function FolderOpenIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none"
      className={className}
    >
      <path 
        d="M4 8V6C4 4.89543 4.89543 4 6 4H14C15.1046 4 16 4.89543 16 6M4 8H8.17548C8.70591 8 9.21462 8.21071 9.58969 8.58579L11.4181 10.4142C11.7932 10.7893 12.3019 11 12.8323 11H16M4 8C3.44987 8 3.00391 8.44597 3.00391 8.99609V18C3.00391 19.1046 3.89934 20 5.00391 20H19.0039C20.1085 20 21.0039 19.1046 21.0039 18V12.0039C21.0039 11.4495 20.5544 11 20 11M16 11V6M16 11H20M16 6H18C19.1046 6 20 6.89543 20 8V11" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinejoin="round"
      />
    </svg>
  )
}

interface ParsedMention {
  id: string
  label: string
  path: string
  repository: string
  type: "file" | "folder" | "skill" | "agent"
}

/**
 * Parse file/folder/skill/agent mention ID into its components
 * Format: file:owner/repo:path/to/file.tsx or folder:owner/repo:path/to/folder or skill:skill-name or agent:agent-name
 */
function parseMention(id: string): ParsedMention | null {
  const isFile = id.startsWith(MENTION_PREFIXES.FILE)
  const isFolder = id.startsWith(MENTION_PREFIXES.FOLDER)
  const isSkill = id.startsWith(MENTION_PREFIXES.SKILL)
  const isAgent = id.startsWith(MENTION_PREFIXES.AGENT)

  if (!isFile && !isFolder && !isSkill && !isAgent) return null

  // Handle skill mentions (simpler format: skill:name)
  if (isSkill) {
    const skillName = id.slice(MENTION_PREFIXES.SKILL.length)
    return {
      id,
      label: skillName,
      path: "",
      repository: "",
      type: "skill",
    }
  }

  // Handle agent mentions (simpler format: agent:name)
  if (isAgent) {
    const agentName = id.slice(MENTION_PREFIXES.AGENT.length)
    return {
      id,
      label: agentName,
      path: "",
      repository: "",
      type: "agent",
    }
  }

  const parts = id.split(":")
  if (parts.length < 3) return null

  const type = parts[0] as "file" | "folder"
  const repository = parts[1]
  const path = parts.slice(2).join(":") // Handle paths with colons
  const name = path.split("/").pop() || path

  return {
    id,
    label: name,
    path,
    repository,
    type,
  }
}

/**
 * Component to render a single file/folder/skill/agent mention chip (matching canvas style)
 */
function MentionChip({ mention }: { mention: ParsedMention }) {
  const Icon = mention.type === "skill"
    ? SkillIcon
    : mention.type === "agent"
      ? AgentIcon
      : mention.type === "folder"
        ? FolderOpenIcon
        : (getFileIconByExtension(mention.label) ?? FilesIcon)

  const title = mention.type === "skill"
    ? `Skill: ${mention.label}`
    : mention.type === "agent"
      ? `Agent: ${mention.label}`
      : `${mention.repository}:${mention.path}`
  
  return (
    <span
      className="inline-flex items-center gap-1 px-[6px] rounded-[6px] text-sm align-middle bg-black/[0.04] dark:bg-white/[0.08] text-foreground/80 select-none"
      title={title}
    >
      <Icon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
      <span>{mention.label}</span>
    </span>
  )
}

/**
 * Render text with ultrathink highlighting
 */
function renderTextWithUltrathink(text: string): React.ReactNode {
  const parts = text.split(/(ultrathink)/gi)
  if (parts.length === 1) return text

  return parts.map((part, index) => {
    if (part.toLowerCase() === "ultrathink") {
      return (
        <span key={index} className="chroma-text chroma-text-animate">
          {part}
        </span>
      )
    }
    return part
  })
}

/**
 * Hook to render text with file/folder mentions and ultrathink highlighting
 * Returns array of React nodes with mentions rendered as chips
 */
export function useRenderFileMentions(text: string): React.ReactNode[] {
  return useMemo(() => {
    const nodes: React.ReactNode[] = []
    const regex = /@\[([^\]]+)\]/g
    let lastIndex = 0
    let match: RegExpExecArray | null
    let key = 0

    while ((match = regex.exec(text)) !== null) {
      // Add text before mention (with ultrathink highlighting)
      if (match.index > lastIndex) {
        nodes.push(
          <span key={`text-${key++}`}>
            {renderTextWithUltrathink(text.slice(lastIndex, match.index))}
          </span>,
        )
      }

      const id = match[1]
      const mention = parseMention(id)

      if (mention) {
        nodes.push(<MentionChip key={`mention-${key++}`} mention={mention} />)
      } else {
        // Fallback: show as plain text if not a valid mention
        nodes.push(<span key={`unknown-${key++}`}>{match[0]}</span>)
      }

      lastIndex = match.index + match[0].length
    }

    // Add remaining text (with ultrathink highlighting)
    if (lastIndex < text.length) {
      nodes.push(
        <span key={`text-end-${key}`}>
          {renderTextWithUltrathink(text.slice(lastIndex))}
        </span>
      )
    }

    return nodes
  }, [text])
}

/**
 * Component to render text with file mentions
 */
export function RenderFileMentions({
  text,
  className,
}: {
  text: string
  className?: string
}) {
  const nodes = useRenderFileMentions(text)
  return <span className={className}>{nodes}</span>
}

/**
 * Extract all file/folder mentions from text
 * Returns array of parsed mentions
 */
export function extractFileMentions(text: string): ParsedMention[] {
  const mentions: ParsedMention[] = []
  const regex = /@\[([^\]]+)\]/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    const mention = parseMention(match[1])
    if (mention) {
      mentions.push(mention)
    }
  }

  return mentions
}

/**
 * Check if text contains any file, folder, skill, or agent mentions
 */
export function hasFileMentions(text: string): boolean {
  return /@\[(file|folder|skill|agent):[^\]]+\]/.test(text)
}
