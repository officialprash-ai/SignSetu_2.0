import DashboardLayout from "@/components/DashboardLayout";
import Dictionary from "./Dictionary";
import History from "./History";
import Translator from "./Translator";
import Profile from "./Profile";
import Admin from "./Admin";
import { Route, Switch } from "wouter";

export default function Home() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Translator} />
        <Route path="/dictionary" component={Dictionary} />
        <Route path="/history" component={History} />
        <Route path="/profile" component={Profile} />
        <Route path="/admin" component={Admin} />
      </Switch>
    </DashboardLayout>
  );
}
