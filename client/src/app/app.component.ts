import { Component, ViewChild } from '@angular/core';
import Chatkit from '@pusher/chatkit-client';
import axios from 'axios';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {
  title = 'Angular Chatroom';
  messages = [];
  users = [];
  currentUser: any;
  currentRoom = <any>{};
  usersWhoAreTyping = [];
  attachment = null;

  _username: string = '';
  get username(): string {
    return this._username;
  }

  set username(value: string) {
    this._username = value;
  }

  _message: string = '';

  get message(): string {
    return this._message;
  }

  set message(value: string) {
    this.sendTypingEvent();
    this._message = value;
  }

  fileChangedHandler(event) {
    const file = event.target.files[0];
    this.attachment = file;
    console.log(this.attachment);
  }

  sendMessage() {
    const { message, currentUser, attachment } = this;
    
    if (message.trim() === '') return;

    const messageObj = <any>{
      text: message,
      roomId: '<your room id>',
    };

    if (attachment) {
      messageObj.attachment = {
        file: attachment,
        name: attachment.name,
      };
    }

    currentUser.sendMessage(messageObj);

    this.reset();
    this.attachment = null;
  }

  @ViewChild('form') form;

  reset() {
    this.form.nativeElement.reset()
  }

  sendTypingEvent() {
    const { currentUser, currentRoom } = this;
    currentUser
    .isTypingIn({ roomId: currentRoom.id });
  }

  addUser() {
    const { username } = this;
    axios.post('http://localhost:5200/users', { username })
      .then(() => {
        const tokenProvider = new Chatkit.TokenProvider({
          url: 'http://localhost:5200/authenticate'
        });

        const chatManager = new Chatkit.ChatManager({
          instanceLocator: '<your instance locator>',
          userId: username,
          tokenProvider
        });

        return chatManager
          .connect()
          .then(currentUser => {
            currentUser.subscribeToRoom({
              roomId: '<your room id>',
              messageLimit: 100,
              hooks: {
                onMessage: message => {
                  this.messages.push(message);
                },
                onPresenceChanged: (state, user) => {
                  this.users = currentUser.users.sort((a) => {
                    if (a.presence.state === 'online') return -1;

                    return 1;
                  });
                },
                onUserStartedTyping: user => {
                  this.usersWhoAreTyping.push(user.name);
                },
                onUserStoppedTyping: user => {
                  this.usersWhoAreTyping = this.usersWhoAreTyping.filter(username => username !== user.name);
                }
              },
            })
            .then(currentRoom => {
              this.currentRoom = currentRoom;
            });

            this.currentUser = currentUser;
            this.users = currentUser.users;
          });
      })
        .catch(error => console.error(error))
  }
}
