import DashboardLayout from "@/components/DashboardLayout";
import Translator from "./Translator";
import { Route, Switch } from "wouter";

export default function Home() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Translator} />
      </Switch>
    </DashboardLayout>
  );
}
