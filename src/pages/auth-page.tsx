import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
// ... other imports ...

const insertUserSchema = z.object({
  // ... your schema definition ...
});

function RegisterForm() {
  const [formData, setFormData] = React.useState({
    // ... initial form data ...
  });

  const mutation = useMutation({
    mutationFn: (data: z.infer<typeof insertUserSchema>) => {
      return fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((res) => {
        if (!res.ok) throw new Error("Registration failed");
        return res.json();
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  // ... rest of the RegisterForm component ...
}

export default RegisterForm;