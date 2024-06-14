import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { generateClient } from 'aws-amplify/api';
import { BehaviorSubject, map } from 'rxjs';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AsyncPipe } from '@angular/common';


type TAppsyncSubscribable = {
  subscribe(resolver: {
    next: (payload: any) => void;
    error?: (e: any) => void;
  }): { unsubscribe(): void }
}

type TMessage = {
  from: string;
  to: string;
  message: string;
}

const subscription = `subscription EbSubscription($from: String!){
  newEvent(from: $from){
    from
    to
    message
  }
}`;

const userMutation = `mutation sendUserEvent($from: String!, $message: String!, $to: String!){
  sendLambdaEvent(from: $from, message: $message, to: $to) {
    from
    message
    to
  }
}
`;

enum EListeners {
  USER = 'USER',
  EB = 'EVENT_BRIDGE'
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ReactiveFormsModule, AsyncPipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'appsync-demo-frontend';
  graphqlClient;
  userSubscription$: any;
  eventSubscription$: any;

  #messages: BehaviorSubject<TMessage[]> = new BehaviorSubject([] as TMessage[]);
  messages$ = this.#messages.asObservable();
  ebMessages = this.messages$.pipe(map(messages => messages.filter(({ from }) => from === EListeners.EB)));
  userMessages = this.messages$.pipe(map(messages => messages.filter(({ from }) => from === EListeners.USER)));

  set messages(messages: TMessage[]) {
    this.#messages.next(messages);
  }

  get messages() {
    return this.#messages.getValue();
  }

  eventForm = new FormGroup({
    to: new FormControl('', [Validators.required]),
    from: new FormControl('', [Validators.required]),
    message: new FormControl()
  });

  constructor() {
    this.graphqlClient = generateClient();
  }
    listenForEvents(listener: EListeners): TAppsyncSubscribable {
      return (this.graphqlClient.graphql({
        query: subscription,
        variables: {
          from: listener,
        },
      }) as unknown as TAppsyncSubscribable
    )
  }

  sendMessage() {
    this.graphqlClient.graphql({
      query: userMutation,
      variables:this.eventForm.value
    })
  }
    ngOnInit(): void {
    
      // Listen for events from the user
    this.userSubscription$ = this.listenForEvents(EListeners.USER).subscribe({
      next: ({ data: { newEvent } }) => {
        this.messages = [...this.messages, newEvent];
      },
      error: (e) => {
        console.log(e);
      },
    });

    // Listen for events from the event bridge
    this.eventSubscription$ = this.listenForEvents(EListeners.EB).subscribe({
      next: ({ data: { newEvent } }) => {
        this.messages = [...this.messages, newEvent];
      },
      error: (e) => {
        console.log(e);
      },
    });
  }

  pretiffyMessage(message: TMessage) {  
    return JSON.stringify(message, null, 2);
  }
  ngOnDestroy(): void {
    if (this.eventSubscription$) this.eventSubscription$.unsubscribe();
    if (this.userSubscription$) this.userSubscription$.unsubscribe();
  }
}
