import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListChecks, CircleDollarSign, Trophy, Shuffle } from "lucide-react";

export default function RulesPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-3xl text-primary-foreground flex items-center gap-2">
            <ListChecks className="h-8 w-8 text-accent" />
            Up and Down the River Rules
          </CardTitle>
          <CardDescription>Learn how to play this exciting trick-taking card game.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-foreground">
          <section>
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2 text-primary-foreground">
              <CircleDollarSign className="h-5 w-5 text-accent" />
              Objective
            </h2>
            <p>
              The main goal is to accurately predict (bid) the number of tricks you will win in each round.
              Points are awarded for correct bids, and sometimes penalties are given for incorrect bids.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2 text-primary-foreground">
              <Shuffle className="h-5 w-5 text-accent" />
              Dealing & Rounds
            </h2>
            <p>
              The game is played over several rounds. In each round, the number of cards dealt to each player changes.
              Typically, it starts with one card per player, increases by one card each round up to a maximum (e.g., 7 or 10 cards, depending on players),
              and then decreases by one card each round back down to one.
            </p>
            <p className="mt-2">
              Example (Max 7 cards): Round 1 (1 card), R2 (2 cards), ..., R7 (7 cards), R8 (6 cards), ..., R13 (1 card).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2 text-primary-foreground">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"></path></svg>
              Bidding
            </h2>
            <p>
              After the cards are dealt, players look at their hands and, in turn (usually starting left of the dealer),
              bid the number of tricks they expect to win.
            </p>
            <p className="mt-2">
              A common rule (often called "Screw the Dealer") is that the sum of all bids cannot equal the number of cards dealt in that round.
              This ensures at least one player will be "set" (fail their bid). This app's scorer doesn't enforce this, but it's good to know.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2 text-primary-foreground">
              <Gamepad2 className="h-5 w-5 text-accent" /> {/* Using Gamepad2 as placeholder for Playing */}
              Playing the Hand
            </h2>
            <p>
              The player to the left of the dealer leads the first trick. Players must follow suit if possible.
              If a player cannot follow suit, they may play any card, including a trump card (if a trump suit is determined for the round) or any other suit.
              The highest card of the suit led wins the trick, unless a trump card is played, in which case the highest trump card wins.
              The winner of a trick leads the next trick.
            </p>
             <p className="mt-2">
              (Note: This scorer app doesn't simulate actual card play; you'll play with physical cards and enter results here.)
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2 text-primary-foreground">
              <Trophy className="h-5 w-5 text-accent" />
              Scoring
            </h2>
            <p>The scoring system used by this app is as follows:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>
                <strong>Making your bid exactly:</strong> You score 10 points plus the number of tricks you bid (e.g., bid 3, take 3 = 13 points).
              </li>
              <li>
                <strong>Missing your bid (over or under):</strong> You score 0 points for that round.
              </li>
            </ul>
            <p className="mt-2">
              Other variations exist, such as penalties for missed bids or points for each trick taken even if the bid is missed.
            </p>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2 text-primary-foreground">
              <Award className="h-5 w-5 text-accent" />
              Winning the Game
            </h2>
            <p>
              After all rounds are completed, the player with the highest cumulative score is the winner.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
