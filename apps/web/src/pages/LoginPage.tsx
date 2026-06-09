import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { appBrand } from "../lib/branding";
import { supabase } from "../lib/supabase";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (values: LoginForm) => {
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword(values);
    if (authError) setError(authError.message);
  };

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="text-2xl font-bold">{appBrand.name}</div>
          <CardTitle>Log in</CardTitle>
          <p className="text-sm text-muted-foreground">Open your schedule workspace.</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...register("email")} />
              {formState.errors.email && <p className="text-sm text-destructive">{formState.errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
              {formState.errors.password && <p className="text-sm text-destructive">{formState.errors.password.message}</p>}
            </div>
            {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            <Button className="w-full" type="submit" disabled={formState.isSubmitting}>
              <LogIn className="h-4 w-4" />
              Log in
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              New here? <Link className="font-medium text-primary" to="/register">Create an account</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
