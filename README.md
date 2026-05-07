# SATYA - Message Misinformation Checker
---
Satya is a misinformation checker for messaging apps, which helps the user, (YOU!) to check whether a message is either true or false, factually!
Satya is fast at getting responses!


### Why Satya?
---
These days, a lot of forwarded messages are misleading, outright false or unverified, which is laced with opinion of the sender. I wanted to make sure that the message which I receive is factually true, so I have built this project to help myself and the countless others to verify the factualness and then jumping the gun. (pun intended)


### What does Satya do exactly?
---
Honestly, very simple. Here's the rundown:
- Copy the message you want to verify
- visit Satya
- paste the message onto the text box provided and click "Verify"
- let it cook
- boom, results are here. make what sense you want of it!

No more switching multiple tabs of newsletters to manually verify a message, use Satya, chill in life.


### What did I use?
---
- React
- Expo
- Google Cloud Platform (Google Fact Check)
- GroqCloud (Llama-3.32-70b-versatile)
- ngrok (tunneling)

### Run it locally
---

clone the repo, then:
- Open terminal and:
  
```
cd mobile
```
then, 

```
npx expo start
```
- Open another terminal and:
  
```
cd backend
```
then, 

```
node server.js
```
open powershell and type in:

```
ngrok http 8080
```

### What will happen next?
---
- [ ] Broswer Extension for Whatsapp Web and Telegram
- [ ] Support for Indian Languages
- [ ] Mobile app using React Native for mobile users
- [ ] Major QoL (Quality of Life) Changes to the UI/UX
- [ ] Commercialization


### License
---
I have licensed it with the MIT License, free to use, build on it, scrap it and make something new, modify, your jurisdiction. Just credit me.

