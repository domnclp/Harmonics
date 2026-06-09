import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";
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

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6)
});

type RegisterForm = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema)
  });

  const onSubmit = async (values: RegisterForm) => {
    setError(null);
    setMessage(null);
    const { error: authError } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { data: { name: values.name } }
    });
    if (authError) setError(authError.message);
    else setMessage("Account created. Check your email if confirmation is enabled.");
  };

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="text-2xl font-bold">{appBrand.name}</div>
          <CardTitle>Create account</CardTitle>
          <p className="text-sm text-muted-foreground">Start with a schedule, then track the day as it happens.</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" autoComplete="name" {...register("name")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...register("email")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
            </div>
            {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            {message && <p className="rounded-md bg-secondary/15 p-3 text-sm">{message}</p>}
            <Button className="w-full" type="submit" disabled={formState.isSubmitting}>
              <UserPlus className="h-4 w-4" />
              Register
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account? <Link className="font-medium text-primary" to="/login">Log in</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
