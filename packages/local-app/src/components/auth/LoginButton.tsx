import { Button } from "@/components/ui/button"
import { getServerUrl } from "@/lib/remote-api"

export function LoginButton() {
  return (
    <a
      href={`${getServerUrl()}/login`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <Button variant="outline" size="sm" className="gap-1.5">
        Sign in to TokenRank Cloud
      </Button>
    </a>
  )
}
