import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-loss/20">
              <AlertTriangle className="h-6 w-6 text-loss" />
            </div>
          </div>
          <CardTitle className="text-xl text-foreground">Authentication Error</CardTitle>
          <CardDescription className="text-muted-foreground">
            Something went wrong during authentication. Please try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Link href="/auth/login">
            <Button className="w-full">Try Again</Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="w-full">Go Home</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
