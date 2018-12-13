import {Challenge} from "./entity/wiki-content/Challenge";
import {getRepository, Repository} from "typeorm";
import * as schedule from 'node-schedule';
import {Subscription} from "./entity/user/Subscription";
import * as webPush from 'web-push';
//import * as sendmail from 'sendmail';
import {PasswordResetToken} from "./entity/user/PasswordResetToken";
import {WikiClient} from "./wikiData/WikiClient";
import {Container, Service} from "typedi";
import {Role, User} from "./entity/user/User";

@Service()
export class Tasks {

    public mondayJob;
    public thursdayJob;
    public sundayJob;

    public syncWithWikiJob;

    public constructor(
    ) {

        // db updates

        //update wiki data on server restart
        this.syncWithWiki().then((res) => console.log(res));

        let syncWithWikiTimer = new schedule.RecurrenceRule();
        syncWithWikiTimer.hour = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
        syncWithWikiTimer.minute = 0;
        this.syncWithWikiJob = schedule.scheduleJob(syncWithWikiTimer, this.syncWithWiki);

        // notify monday
        let mondayTimer = new schedule.RecurrenceRule();
        mondayTimer.dayOfWeek = [1];
        mondayTimer.hour = 17;
        mondayTimer.minute = 0;
        this.mondayJob = schedule.scheduleJob(mondayTimer, () => {
            Tasks.sendNotification({
                title: "Enviroommate",
                message: "Eure neue Wochenchallenge ist online! Neugierig?"
            }).catch((err) => console.error(err));
        });

        // notify thursday
        let thursdayTimer = new schedule.RecurrenceRule();
        thursdayTimer.dayOfWeek = [1];
        thursdayTimer.hour = 17;
        thursdayTimer.minute = 0;

        this.thursdayJob = schedule.scheduleJob(thursdayTimer, () => {
            Tasks.sendNotification({
                title: "Enviroommate",
                message: "Wie siehts aus bei unseren Enviroommates? Habt ihr Bock?"
            }).catch((err) => console.error(err));
        });

        // notify sunday
        let sundayTimer = new schedule.RecurrenceRule();
        sundayTimer.dayOfWeek = [1];
        sundayTimer.hour = 17;
        sundayTimer.minute = 0;

        this.sundayJob = schedule.scheduleJob(sundayTimer, () => {
            Tasks.sendNotification({
                title: "Enviroommate",
                message: "Zeit eure Punkte einzusammeln! Wir sind gespannt, wie eure Woche gelaufen ist!"
            }).catch((err) => console.error(err));
        });

        if (process.env.NODE_ENV !== "production") {
            const defaultAdmin = new User();
            defaultAdmin.userName = "root";
            defaultAdmin.password = "root";
            defaultAdmin.screenName = "root";
            defaultAdmin.role = Role.Admin;
            const defaultUser = new User();
            defaultUser.userName = "user";
            defaultUser.password = "user";
            defaultUser.screenName = "user";
            defaultUser.role = Role.User;

            const userRepo = getRepository(User);
            userRepo.findOneOrFail({where: {userName: "root"}}).then(() => {
                console.error("Found default test users! This should not happen in PRODUCTION")
            }).catch(
                _ => {
                    userRepo.save(defaultUser)
                        .catch(e => console.error(e));
                    userRepo.save(defaultAdmin)
                        .catch(e => console.error(e));
                }
            )

        }
    }

    async syncWithWiki() {
        console.log("syncing data from wiki...");
        Container.get(WikiClient).syncAllPages().catch(err => console.error("Error: " + err.toString()))
    }

    static async sendNotification(param) {
        const options = {
            TTL: 60 * 60 * 24
        };
        let subscriptions = await getRepository(Subscription).find();
        subscriptions.forEach((val,i,subs) => {
            const subscription = Subscription.build(val.endpoint, val.auth, val.p256dh);
            webPush.sendNotification(subscription, JSON.stringify(param), options)
                .then(function() {
                    console.log("send notification to " + JSON.stringify(subscription));
                })
                .catch(function(err) {
                    if (err.statusCode === 410) {
                        return Tasks.deleteSubscriptionFromDatabase(val.id);
                    } else {
                        console.log('Subscription is no longer valid: ', err);
                    }
                });
        }, 60 * 60 * 24 * 1000);
    }

    private static deleteSubscriptionFromDatabase(id: number) {
        getRepository(Subscription).delete({id: id}).catch(err => console.log(err))
    }

    public static async sendPasswordReset(userId) {

        let token = await getRepository(PasswordResetToken).findOne({user: userId});
        if(!token) return;
        const sendmail = require('sendmail')({
            logger: {
                debug: console.log,
                info: console.info,
                warn: console.warn,
                error: console.error
            },
            silent: false,
            dkim: false,
        })
        sendmail({
            from: 'no-reply@enviroommate.org',
            to: token.user.userName,
            subject: 'Enviroommate Passwort zurücksetzen',
            text: 'https://enviroommate.org/#/resetPassword?resettoken=' + token.resetToken,
        }, function(err, reply) {
            console.log(err && err.stack);
            console.log(reply);
        });
    }
}
