import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, SectionTitle, BADGE_COLORS } from "@/components/shared/PageHeader";
import { PrototypeBanner } from "@/components/shared/PrototypeBanner";
import { useToast } from "@/hooks/use-toast";
import { MessageSquareHeart, Star } from "lucide-react";

const EXISTING_FEEDBACK = [
  { role: "Researcher", rating: 4, comment: "Report export saved a lot of time compared to our old spreadsheet process." },
  { role: "Student", rating: 5, comment: "The explainable AI page made the model's decisions much easier to understand for my thesis." },
  { role: "Admin", rating: 4, comment: "Would like more batch/cohort analytics in a future version." },
];

export default function Feedback() {
  const { toast } = useToast();
  const [rating, setRating] = useState(4);
  const [comment, setComment] = useState("");
  const [role, setRole] = useState("researcher");

  const submit = () => {
    toast({ title: "Feedback submitted (demo)", description: "Thank you — this prototype does not persist feedback to a backing store yet." });
    setComment("");
  };

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[900px] mx-auto space-y-6">
        <PageHeader
          icon={MessageSquareHeart}
          title="User Feedback"
          description="Collect structured feedback on prediction workflow, report usefulness, and UI clarity to support pilot readiness."
          badges={[{ label: "Prototype", color: BADGE_COLORS.prototype }]}
        />
        <PrototypeBanner text="Feedback submitted here is not persisted to a database in this prototype — it demonstrates the intended collection workflow." />

        <Card className="border-border/60">
          <CardContent className="pt-5 pb-5 space-y-4">
            <SectionTitle>Submit Feedback</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">I am a...</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="researcher">Researcher</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Rate the workflow / report usefulness</Label>
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <Star key={n} onClick={() => setRating(n)}
                      className={`w-5 h-5 cursor-pointer ${n <= rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground"}`} />
                  ))}
                </div>
              </div>
            </div>
            <div>
              <Label className="text-xs">Suggest missing features or comments</Label>
              <Textarea className="mt-1" rows={3} value={comment} onChange={e => setComment(e.target.value)} placeholder="What would make this more useful for your lab?" />
            </div>
            <Button onClick={submit} size="sm">Submit Feedback</Button>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="pt-5 pb-5">
            <SectionTitle>Feedback Table (Admin View — Demo)</SectionTitle>
            <div className="space-y-2">
              {EXISTING_FEEDBACK.map((f, i) => (
                <div key={i} className="flex items-start gap-3 bg-secondary/30 rounded-md px-3 py-2 text-sm">
                  <Badge variant="outline" className="text-[10px] shrink-0">{f.role}</Badge>
                  <div className="flex-1">
                    <div className="flex gap-0.5 mb-0.5">
                      {[1, 2, 3, 4, 5].map(n => (
                        <Star key={n} className={`w-3 h-3 ${n <= f.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
                      ))}
                    </div>
                    <p className="text-muted-foreground text-xs">{f.comment}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
