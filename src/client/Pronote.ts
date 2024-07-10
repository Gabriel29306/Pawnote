import type { NextAuthenticationCredentials } from "~/authenticate/types";
import type { ApiLoginInformations } from "~/api/login/informations/types";
import type { PawnoteFetcher } from "~/utils/fetcher";

import {
  callApiUserHomework,
  callApiUserHomeworkStatus,
  callApiUserTimetable,

  type ApiUserData
} from "~/api";

import { StudentHomework } from "~/parser/homework";
import { Period, readOngletPeriods, OngletPeriods } from "~/parser/period";

import { Session } from "~/session";
import Queue from "~/utils/queue";

import { readPronoteApiDate, transformDateToPronoteString, translateToPronoteWeekNumber } from "~/pronote/dates";
import { getUTCDate } from "~/utils/dates";
import { callApiUserGrades } from "~/api/user/grades";
import { StudentGrade } from "~/parser/grade";
import { StudentAverage } from "~/parser/average";
import { readPronoteApiGrade } from "~/pronote/grades";
import { callApiUserEvaluations } from "~/api/user/evaluations";
import { StudentEvaluation } from "~/parser/evaluation";
import { PronoteApiAccountId } from "~/constants/accounts";
import { StudentPersonalInformation } from "~/parser/personalInformation";
import { callApiUserPersonalInformation } from "~/api/user/personalInformation";
import { StudentAttachment } from "~/parser/attachment";
import { callApiUserPresence } from "~/api/user/presence";
import { callApiUserResources } from "~/api/user/resources";
import { callApiUserLessonResource } from "~/api/user/lessonResource";
import { callApiUserLessonHomework } from "~/api/user/lessonHomework";
import { StudentLessonResource } from "~/parser/lessonResource";
import { callApiUserNews } from "~/api/user/news";
import { StudentNews, StudentNewsItemQuestion } from "~/parser/news";
import { callApiUserDiscussions } from "~/api/user/discussions";
import { StudentDiscussion, StudentDiscussionsOverview } from "~/parser/discussion";
import { PronoteApiMessagesButtonType } from "~/constants/messages";
import { callApiUserMessages } from "~/api/user/messages";
import { MessagesOverview } from "~/parser/messages";
import { PronoteApiOnglets } from "~/constants/onglets";
import { callApiUserAttendance } from "~/api/user/attendance";
import { StudentAbsence, StudentDelay, StudentObservation, StudentPrecautionaryMeasure, StudentPunishment } from "~/parser/attendance";
import { callApiUserMessageRecipients } from "~/api/user/messageRecipients";
import { DiscussionCreationRecipient, FetchedMessageRecipient } from "~/parser/recipient";
import Holiday from "~/parser/holiday";
import type { PronoteApiNewsPublicSelf } from "~/constants/news";
import { callApiUserNewsStatus } from "~/api/user/newsStatus";
import Authorizations from "~/parser/authorizations";
import type { PronoteApiUserResourceType } from "~/constants/users";
import { callApiUserCreateDiscussionRecipients } from "~/api/user/createDiscussionRecipients";
import { PronoteApiResourceType } from "~/constants/resources";
import { callApiUserCreateDiscussion } from "~/api/user/createDiscussion";
import { callApiUserCreateDiscussionMessage } from "~/api/user/createDiscussionMessage";
import { getPronoteMessageButtonType } from "~/pronote/messages";
import { createPronoteUploadCall } from "~/pronote/requestUpload";
import { PronoteApiFunctions } from "~/constants/functions";
import { callApiUserHomeworkUpload } from "~/api/user/homeworkUpload";
import { callApiUserHomeworkRemoveUpload } from "~/api/user/homeworkRemoveUpload";
import { callApiUserHomepage } from "~/api/user/homepage";
import { Partner } from "~/parser/partner";
import { callApiUserPartnerURL } from "~/api/user/partnerURL";
import { PronoteApiDomainFrequencyType, PronoteApiMaxDomainCycle } from "~/constants/domain";
import { parseSelection } from "~/pronote/select";
import { TimetableOverview } from "~/parser/timetable";
import { callApiUserDiscussionCommand } from "~/api/user/discussionCommand";
import { ApiUserDiscussionAvailableCommands } from "~/api/user/discussionCommand/types";
import type { PawnoteSupportedFormDataFile } from "~/utils/file";
import { callApiUserGeneratePDF } from "~/api/user/generatePDF";
import { Onglets } from "~/parser/onglets";

//TODO: Check descriptions and language!
/** A reprensentation of the Pronote client.
 * ## Table of contents
 * - [Constructor](#constructor)
 * - [Instance Informations](#instance-informations)
 * - [User Informations](#user-informations)
 * - [Key Dates](#key-dates)
 * - [Grades and Evaluations](#grades-and-evaluations)
 * - [Timetable](#timetable)
 * - [Homework](#homework)
 * - [Resources](#resources)
 * - [Discussions](#discussions)
 * - [Attendances](#attendances)
 * - [Periods](#periods)
 * - [News](#news)
 * - [Utils](#utils)
 * - [Not for normal uses](#not-for-normal-uses)
 * @groupDescription Constructor
 * How `Pronote` Class instance is created.
 * @groupDescription Instance Informations
 * Category about the instance informations.
 * @groupDescription User Informations
 * Here you can get information about the student like name or current class.
 * @groupDescription Key Dates
 * Category about the key dates of the school year.
 * @groupDescription Grades and Evaluations
 * Category about the grades and evaluations.
 * @groupDescription Timetable
 * This category links everything related to timetable
 * @groupDescription Homework
 * Category about homeworks.
 * @groupDescription Resources
 * This category allows you to get resources in different ways
 * @groupDescription Discussions
 * With this category you can view and interact with discussions.
 * @groupDescription Periods
 * This category is for everythings linked with periods.
 * @groupDescription News
 * In this category, you can find methods about newq.
 * @groupDescription Utils
 * This category lists all non-essential tools
 * @groupDescription Not for normal uses
 * This is a category for properties and methods exposed but normaly not used.
*/
export default class Pronote {
  /**
   * Custom fetcher to call the API with another API than fetch.
   * @group Utils
   */
 public fetcher: PawnoteFetcher;
 
  /**
   * A lot of informations from the first login request.
   * @group Utils
   */
  public loginInformations: ApiLoginInformations["output"]["data"];

  #authorizations: Authorizations;
  /**
   * View authorizations of the user in the instance.
   * @group Instance Informations
   */
  public get authorizations (): Authorizations {
    return this.#authorizations;
  }
  /**
   * First day of the entire timetable.
   * Used to get week numbers relative to this date.
   * @group Key Dates
   */
  public firstMonday: Date;


  #onglets: Onglets;
  public get onglets(): Onglets {
    return this.#onglets;
  }

  /**
   * First day of the entire school year.
   * @group Key Dates
   */
  public firstDate: Date;

  /**
   * Last day of the entire year.
   * Used to get week numbers relative to this date.
   * @group Key Dates
   */
  public lastDate: Date;

  /**
   * The next school opening day.
   * @group Key Dates
   */
  public nextOpenDate: Date;

  /**
   * Username that SHOULD be used for any further authentication.
   * @group User Informations
  */
  public username: string;

  /**
   * Acts as a replacement for the password.
   * Whenever you need to authenticate, you should use this token
   * from now on if you want to avoid entering your password again.
   *
   * Note that this token is only valid for the `deviceUUID` you provided
   * in the authentication options.
   * @group User Informations
   */
  public nextTimeToken: string;

  /**
   * Root URL of the Pronote instance.
   * @group Instance Informations
   */
  public pronoteRootURL: string;

  /**
   * ID of this account type in the Pronote API.
   * @group Instance Informations
   */
  public accountTypeID: PronoteApiAccountId;

  /**
   * ID of the currently running session on Pronote.
   * @group Instance Informations
   */
  public sessionID: number;

  /**
   * Whether the Pronote instance you're connected to
   * is a demonstration server or not.
   *
   * @remark
   * `authenticateToken` won't work against them since
   * next-time tokens aren't saved, even though
   * it's able to generate them.
   * @group Instance Informations
   */
  public isDemo: boolean;

  /**
   * First name and family name of the logged in student.
   * @group User Informations
   */
  public studentName: string;

  /**
   * School name of the Pronote instance.
   * @group Instance Informations
   */
  public schoolName: string;

  /**
   * The current class of the student.
   * @example
   * // get the current class of the student, like "3A"
   * currentClass = pronoteInstance.studentClass
   * @group User Informations
  */
  public studentClass: string;

  /**
   * An absolute URL giving the profile picture of the logged in student,
   * if exists.
   * @group User Informations
   */
  public studentProfilePictureURL?: string;

  /**
   * A list of year periods.
   * @group Periods
   */
  public periods: Period[];
  private periodsByOnglet: Map<PronoteApiOnglets, OngletPeriods>;

  /**
   * Indicates if the student is a class delegate
   * @group User Informations
   */
  public isDelegate: boolean;
  /**
   * Indicates if the student is part of the board of directors
   * @group User Informations
   */
  public isMemberCA: boolean;

  /**
   * A list of vacation periods
   * @group Key Dates
   */
  public holidays: Holiday[];

  private queue: Queue;

  #weekFrequencies: Array<{
    type: PronoteApiDomainFrequencyType
    name: string
  } | null>;

  /** 
   * @constructor
   * @param {PawnoteFetcher} fetcher
   * Custom fetcher to call the API with another API than fetch.
   * @param {Session} session
   * Represent the user session.
   * @param {NextAuthenticationCredentials } credentials
   * A Object containing the username and the nextAuth token.
   * @param {ApiUserData["output"]["data"]["donnees"]} user
   * The user data.
   * @param {ApiLoginInformations["output"]["data"]} loginInformations
   * A lot of informations from the first login request
   * @group Constructor
   */
  constructor (
    fetcher: PawnoteFetcher,

    private session: Session,
    credentials: NextAuthenticationCredentials,
    
    // Accessor for raw data returned from Pronote's API.
    private user: ApiUserData["output"]["data"]["donnees"],
    loginInformations: ApiLoginInformations["output"]["data"]
  ) {
    this.fetcher = fetcher;
    this.loginInformations = loginInformations;
    this.firstMonday = readPronoteApiDate(loginInformations.donnees.General.PremierLundi.V);
    this.firstDate = readPronoteApiDate(loginInformations.donnees.General.PremiereDate.V);
    this.lastDate = readPronoteApiDate(loginInformations.donnees.General.DerniereDate.V);

    this.#authorizations = new Authorizations(user.autorisations);
    this.#onglets = new Onglets(user);

    this.username = credentials.username;
    this.nextTimeToken = credentials.token;
    this.nextOpenDate = readPronoteApiDate(loginInformations.donnees.General.JourOuvre.V);
    this.pronoteRootURL = session.instance.pronote_url;
    this.accountTypeID = session.instance.account_type_id;
    this.sessionID = session.instance.session_id;
    this.isDemo = session.instance.demo;
    this.studentName = user.ressource.L;
    this.schoolName = user.ressource.Etablissement.V.L;
    this.studentClass = user.ressource.classeDEleve.L;

    if (user.ressource.avecPhoto) {
      this.studentProfilePictureURL = new StudentAttachment(this, {
        G: 1,
        N: user.ressource.N,
        L: "photo.jpg"
      }).url;
    }

    this.periods = [];
    for (const period of loginInformations.donnees.General.ListePeriodes) {
      this.periods.push(new Period(this, period));
    }

    this.periodsByOnglet = new Map();
    for (const ongletPeriods of user.ressource.listeOngletsPourPeriodes.V) {
      this.periodsByOnglet.set(ongletPeriods.G, readOngletPeriods(this.periods, ongletPeriods));
    }

    this.isDelegate = user.ressource.estDelegue ?? false;
    this.isMemberCA = user.ressource.estMembreCA ?? false;
    // TODO: user.ressource.avecDiscussionResponsables;
    // TODO: user.ressource.listeClassesDelegue;
    // TODO: user.ressource.nbMaxJoursDeclarationAbsence;
    // TODO: user.ressource.listeGroupes

    this.holidays = loginInformations.donnees.General.listeJoursFeries.V.map((holiday) => new Holiday(holiday));

    this.#weekFrequencies = [];
    for (let weekNumber = 1; weekNumber <= PronoteApiMaxDomainCycle; weekNumber++) {
      this.#weekFrequencies[weekNumber] = null;

      for (const genre of [PronoteApiDomainFrequencyType.Fortnight1, PronoteApiDomainFrequencyType.Fortnight2]) {
        const frequency = parseSelection(loginInformations.donnees.General.DomainesFrequences[genre].V);
        if (frequency.includes(weekNumber)) {
          this.#weekFrequencies[weekNumber] = {
            name: loginInformations.donnees.General.LibellesFrequences[genre],
            type: genre
          };
        }
      }
    }

    // For further requests, we implement a queue.
    this.queue = new Queue();
  }

  /**
   * You shouldn't have to use this usually,
   * but it's exported here in case of need
   * to do some operations required.
   * @group Not for normal uses
   */
  public getAESEncryptionKeys () {
    return this.session.getAESEncryptionKeys();
  }

  /**
   * Obtain a overview of the Timetable between the `start` and `end` arguments.
   * @param {Date} start - From when date to recover Timetable.
   * @param {Date=} end - Until when to recover Timetable.
   * @returns {Promise<TimetableOverview>}
   * @see [timetable.ts](https://github.com/LiterateInk/Pawnote/blob/js/examples/timetable.ts)
   * @example
   * // Returns the Timetable from today to the end of the year.
   * const overview = await pronoteInstance.getTimetableOverviewForInterval(new Date());
   * const timetable = overview.parse({
   *   withSuperposedCanceledClasses: false,
   *   withCanceledClasses: true,
   *   withPlannedClasses: true
   * });
   * 
   * // Returns the Timetable of January 2, 2024.
   * const overview = await PronoteInstance.getTimetableOverviewForInterval(new Date(2024, 1, 2), new Date(2024, 1, 2));
   * const timetable = overview.parse({
   *   withSuperposedCanceledClasses: false,
   *   withCanceledClasses: true,
   *   withPlannedClasses: true
   * });
   * 
   * // Returns the Timetable between January 1, 2024 and January 15, 2024.
   * const overview = await PronoteInstance.getTimetableOverviewForInterval(new Date(2024, 1, 1), new Date(2024, 1, 15));
   * const timetable = overview.parse({
   *   withSuperposedCanceledClasses: false,
   *   withCanceledClasses: true,
   *   withPlannedClasses: true
   * });
   * @group Timetable
   */
  public async getTimetableOverviewForInterval (start: Date, end?: Date): Promise<TimetableOverview> {
    return this.queue.push(async () => {
      const { data: { donnees: data } } = await callApiUserTimetable(this.fetcher, {
        resource: this.user.ressource,
        session: this.session,
        startPronoteDate: transformDateToPronoteString(start),
        endPronoteDate: end && transformDateToPronoteString(end)
      });

      return new TimetableOverview(this, data);
    });
  }

  /**
   * Obtain a overview of the Timetable between the `start` and `end` arguments.
   * @param {number} weekNumber - The week to recover the timetable.
   * @returns {Promise<TimetableOverview>}
   * @see [timetable.ts](https://github.com/LiterateInk/Pawnote/blob/js/examples/timetable.ts)
   * @example
   * currentWeekNumber = translateToPronoteWeekNumber(new Date(), pronoteInstance.firstDate)
   * // Returns the Timetable of the current week.
   * const overview = await pronoteInstance.getTimetableOverviewForInterval(currentWeekNumber);
   * const timetable = overview.parse({
   *   withSuperposedCanceledClasses: false,
   *   withCanceledClasses: true,
   *   withPlannedClasses: true
   * });
   * @group Timetable
   */
  public async getTimetableOverviewForWeek (weekNumber: number): Promise<TimetableOverview> {
    return this.queue.push(async () => {
      const { data: { donnees: data } } = await callApiUserTimetable(this.fetcher, {
        resource: this.user.ressource,
        session: this.session,
        weekNumber
      });

      return new TimetableOverview(this, data);
    });
  }

  /**
   * Return Homeworks between `from` and `to` params.
   * @param {Date} from - From when date to recover Homework.
   * @param {Date=} to - Until when to recover Homework.
   * Default it is the end of the scholar year using `lastDate` class property.
   * @example
   * // Returns today's Homework until the end of the school year.
   * await pronoteInstance.getHomeworkForInterval(new Date());
   * // Returns today's Homework.
   * await pronoteInstance.getHomeworkForInterval(new Date(), new Date());
   * // Returns the Homework between January 1, 2024 and January 15, 2024.
   * await pronoteInstance.getHomeworkForInterval(new Date(2024, 1, 1), new Date(2024, 1, 15));
   * @group Homework
   */
  public async getHomeworkForInterval (from: Date, to? : Date): Promise<StudentHomework[]> {
    if (!(to instanceof Date)) {
      to = this.lastDate
    }
    from = getUTCDate(from);
    to   = getUTCDate(to);

    let fromWeekNumber = translateToPronoteWeekNumber(from, this.firstMonday);
    let toWeekNumber   = translateToPronoteWeekNumber(to, this.firstMonday);

    // Make sure to set the default to 1.
    if (fromWeekNumber <= 0) fromWeekNumber = 1;
    if (toWeekNumber <= 0) toWeekNumber = 1;

    return this.queue.push(async () => {
      const { data: { donnees: data } } = await callApiUserHomework(this.fetcher, {
        session: this.session,
        fromWeekNumber,
        toWeekNumber
      });

      return data.ListeTravauxAFaire.V
        .map((homework) => new StudentHomework(this, homework))
        .filter((homework) => <Date>from <= homework.deadline && homework.deadline <= <Date>to);
    });
  }

  /**
   * Returns the homework for the `weekNumber` week since the start of the school year.
   * @param {number} weekNumber - The number of the week we want to collect homework.
   * @returns {Promise<StudentHomework[]>}
   * @see
   * {@link translateToPronoteWeekNumber} to obtain week number (not exposed now).
   * [homework.ts](https://github.com/LiterateInk/Pawnote/blob/js/examples/homework.ts)
   * @example
   * // Obtain week from the start of the year.
   * let daysDiff = Math.floor((getUTCTime(new Datr()) - getUTCTime(pronoteInstance.firstMonday)) / (1000 * 60 * 60 * 24));
   * let week = 1 + Math.floor(daysDiff / 7);
   * // Now we can obtain the homework of this week.
   * homeworks = await pronoteInstance.getHomeworkForWeek(week);
   * // Next, we show informations about not done homework.
   * homework
   *   .filter((homework) => !homework.done)
   *   .forEach((homework) => {
   *     console.log(homework.subject.name, "to finish before the", homework.deadline.toLocaleString());
   *     console.log("(description) =>", homework.description);
   *   }
   * @group Homework
   */
  public async getHomeworkForWeek (weekNumber: number): Promise<StudentHomework[]> {
    return this.queue.push(async () => {
      const { data: { donnees: data } } = await callApiUserHomework(this.fetcher, {
        session: this.session,
        fromWeekNumber: weekNumber
      });

      return data.ListeTravauxAFaire.V
        .map((homework) => new StudentHomework(this, homework));
    });
  }

  /**
   * Returns the resources for the `weekNumber` week since the start of the school year.
   * @param {number} weekNumber
   * The number of the week we want to collect resources.
   * @returns {Promise<{lessons: StudentLessonResource[]}>}
   * @example
   * // First, let's get current week number!
   * let daysDiff = Math.floor((getUTCTime(new Datr()) - getUTCTime(pronoteInstance.firstMonday)) / (1000 * 60 * 60 * 24));
   * let week = 1 + Math.floor(daysDiff / 7);
   * // Good, now we can get ressouces.
   * let resources = await pronoteInstance.getResourcesForWeek(week);
   * resources.array.forEach(resource => {
   *   console.log(resource.subject.name);
   *   for ([title, description] of resource.contents) {
   *     console.log(title ?? "(no title)");
   *     console.log(description ?? "(no description)");
   *   }
   *   // Get the homework scheduled for the same lesson. And play with it.
   *   homework = await resource.getHomework();
   * });
   * @group Resources
   */
  public async getResourcesForWeek (weekNumber: number) {
    return this.queue.push(async () => {
      const { data: { donnees: data } } = await callApiUserResources(this.fetcher, {
        session: this.session,
        fromWeekNumber: weekNumber
      });

      return {
        lessons: data.ListeCahierDeTextes.V
          .map((lesson) => new StudentLessonResource(this, lesson))
      };
    });
  }

  /**
   * Return resources between `from` and `to` params.
   * @param {Date} from - From when date to recover Resources.
   * @param {Date=} to - Until when to recover Resources.
   * Default it is the end of the scholar year using `lastDate` class property.
   * @example
   * // Returns today's Resources until the end of the school year.
   * await pronoteInstance.getResourcesForInterval(new Date());
   * // Returns today's Resources.
   * await pronoteInstance.getResourcesForInterval(new Date(), new Date());
   * // Returns the Resources between January 1, 2024 and January 15, 2024.
   * homeworks = await pronoteInstance.getResourcesForInterval(new Date(2024, 1, 1), new Date(2024, 1, 15));
   * // Select the first one.
   * homework = homeworks[0];
   * // Show informations about it.
   * console.log("Subject:" + homework.subject.name);
   * console.log("Description:" + homework.description);
   * @group Resources
   */
  public async getResourcesForInterval (from: Date, to?: Date) {
    if (!(to instanceof Date)) {
      to = this.lastDate;
    }

    from = getUTCDate(from);
    to   = getUTCDate(to);

    let fromWeekNumber = translateToPronoteWeekNumber(from, this.firstMonday);
    let toWeekNumber   = translateToPronoteWeekNumber(to, this.firstMonday);

    // Make sure to set the default to 1.
    if (fromWeekNumber <= 0) fromWeekNumber = 1;
    if (toWeekNumber <= 0) toWeekNumber = 1;

    return this.queue.push(async () => {
      const { data: { donnees: data } } = await callApiUserResources(this.fetcher, {
        session: this.session,
        fromWeekNumber,
        toWeekNumber
      });

      return {
        lessons: data.ListeCahierDeTextes.V
          .map((lesson) => new StudentLessonResource(this, lesson))
          .filter((lesson) => <Date>from <= lesson.end && lesson.end <= <Date>to)
      };
    });
  }

  /**
   * Set an homework as done or not.
   * @param {string} homeworkID - The id of the homework to update status.
   * @param {boolean} done - Is the homework is done?
   * @returns {Promise<void>}
   * @example
   * // Get today's Homework. (see getResourcesForInterval)
   * homeworks = await pronoteInstance.getHomeworkForInterval(new Date(), new Date());
   * // Select the first one.
   * homework = homeworks[0];
   * // Show informations about it.
   * console.log("Subject:" + homework.subject.name);
   * console.log("Description:" + homework.description);
   * // Set it as done now !
   * await pronoteInstance.patchHomeworkStatus(homework.id, true);
   * @group Homework
   */
  public async patchHomeworkStatus (homeworkID: string, done: boolean): Promise<void> {
    return this.queue.push(async () => {
      await callApiUserHomeworkStatus(this.fetcher, {
        session: this.session,
        id: homeworkID,
        status: done
      });

      return void 0;
    });
  }

  /**
   * Get the grades periods.
   * @returns {Period[]}
   * @example
   * // Get periods for grades.
   * periods = pronoteInstance.readPeriodsForGradesOverview();
   * // Get the first one.
   * period = periods[0];
   * // Show some informations.
   * console.log("Name:" + period.name);
   * console.log("Starting date:" + period.start.toTimeString());
   * console.log("Ending date:" + period.end.toTimeString());
   * @group Periods
   */
  public readPeriodsForGradesOverview (): Period[] {
    return this.periodsByOnglet.get(PronoteApiOnglets.Grades)!.values.map((period) => period.linkedPeriod)
      .filter(Boolean) as Period[];
  }

  /**
   * Get the current grades period.
   * @returns {Period}
   * @example
   * // Get the current grades period.
   * period = pronoteInstance.readDefaultPeriodForGradesOverview();
   * // Show some informations.
   * console.log("Name:" + period.name);
   * console.log("Starting date:" + period.start.toTimeString());
   * console.log("Ending date:" + period.end.toTimeString());
   * @group Periods
   */
  public readDefaultPeriodForGradesOverview (): Period {
    return this.periodsByOnglet.get(PronoteApiOnglets.Grades)!.default;
  }

  /**
   * Get grades overview for a specific period.
   * Including student's grades with averages and the global averages.
   *
   * @remark Internally used in the `Period` class.
   * @param {Period=} period - Period the grades overview will be from.
   * Default is current period.
   * @returns {Promise<{
   * grades: StudentGrade[];
   * averages: StudentAverage[];
   * overallAverage: undefined | number | PronoteApiGradeType;
   * classAverage: undefined | number | PronoteApiGradeType;}>}
   * @see [grades-overview.ts](https://github.com/LiterateInk/Pawnote/blob/js/examples/grades-overview.ts)
   * @example
   * // Get grades from current period.
   * overview = await pronoteInstance.getGradesOverview()
   * // Get the last 5 grades.
   * grades = overview.grades.slice(-5);
   * // Show information.
   * grades.forEach(grade => {
   *   // Check if the note is a number.
   *   if (typeof value === "number") {
   *     console.log("In ", grade.subject.name);
   *     console.log(grade.comment || "(no description)");
   *     console.log("You have get ", grade.value, "/", grade.outOf);
   *   }
   * });
   * @group Grades and Evaluations
   */
  public async getGradesOverview (period?: Period) {
    if (!(period instanceof Period)) {
      period = this.readDefaultPeriodForGradesOverview()
    }
    return this.queue.push(async () => {
      const { data: { donnees: data } } = await callApiUserGrades(this.fetcher, {
        session: this.session,
        periodID: period.id,
        periodName: period.name
      });

      return {
        grades: data.listeDevoirs.V
          .map((grade) => new StudentGrade(this, grade)),
        averages: data.listeServices.V
          .map((average) => new StudentAverage(average)),

        overallAverage: data.moyGenerale && readPronoteApiGrade(data.moyGenerale.V),
        classAverage: data.moyGeneraleClasse && readPronoteApiGrade(data.moyGeneraleClasse.V)
      };
    });
  }

  /**
   * Get periods for grades reports.
   * @returns {Period[]}
   * @see {@link generateGradesReportPDF}
   * @example
   * // First, we retrieve the periods and look for the one called "Semestre 1".
   * const periods = pronoteInstance.readPeriodsForGradesReport();
   * const period = periods.find((period) => period.name === "Semestre 1");
   * // If there is no result, emit a error.
   * if (!period) throw new Error("Period not found.");
   * // We can fetch report PDF using
   * const reportURL = await pronoteInstance.generateGradesReportPDF(period);
   * // And show url. 
   * console.log("Report URL:", reportURL);
   * @group Periods
   */
  public readPeriodsForGradesReport (): Period[] {
    return this.periodsByOnglet.get(PronoteApiOnglets.GradesReport)!.values.map((period) => period.linkedPeriod)
      .filter(Boolean) as Period[];
  }

  /**
   * Get the current periods for grades reports.
   * @returns {Period}
   * @example
   * // Get the current grades reports period.
   * period = pronoteInstance.readDefaultPeriodForGradesReport();
   * // Show some informations.
   * console.log("Name:" + period.name);
   * console.log("Starting date:" + period.start.toTimeString());
   * console.log("Ending date:" + period.end.toTimeString());
   * @group Periods
   */
  public readDefaultPeriodForGradesReport (): Period {
    return this.periodsByOnglet.get(PronoteApiOnglets.GradesReport)!.default;
  }
// TODO: Change function param to be compatible with doc
  /**
   * Obtain url to get the grade report for a periods.
   * @param {Period=} [period=this.readDefaultPeriodForGradesReport()]
   * Period the grades report will be from. Default is current period.
   * @returns {Promise<string>} An URL to download the PDF file.
   * @example
   * // You can generate the grade report url for the current preiod just with this line.
   * const gradeReportURL = pronoteInstance.generateGradesReportPDF();
   * // And show the url in the console.
   * console.log("Report URL:", gradeReportURL);
   * @group Grades and Evaluations
   */
  public async generateGradesReportPDF (period? : Period) {
    if (!(period instanceof Period)) {
      period = this.readDefaultPeriodForGradesOverview()
    }
    return this.queue.push(async () => {
      const data = await callApiUserGeneratePDF(this.fetcher, {
        session: this.session,
        period
      });

      return this.pronoteRootURL + "/" + data.url;
    });
  }

  /**
   * Get the evaluations periods.
   * @returns {Period[]}
   * @example
   * // We can show evaluations for each period !
   * periods = pronoteInstance.readPeriodsForEvaluations();
   * periods.forEach(period => {
   *   console.group("Period:", period.id)
   *   evaluations = await pronote.getEvaluations(period);
   *   evaluations.forEach((evaluation) => {
   *     console.log(evaluation.name, "::", evaluation.description || "(no description)");
   *     console.log("Submitted the", evaluation.date.toLocaleString());
   * 
   *     console.group("-> Skills");
   * 
   *     evaluation.skills.forEach((skill) => {
   *       console.group(`-> ${skill.item?.name ?? "Unknown skill"}`);
   *       console.log(`${skill.level} : ${skill.abbreviation} (x${skill.coefficient})`);
   *       console.log(`${skill.pillar.name} in the domain of ${skill.domain.name}`);
   *       console.groupEnd();
   *     });
   * 
   *     console.groupEnd();
   * 
   *     // Line break for next iteration.
   *     console.log();
   *   });
   *   console.groupEnd();
   *   console.log();
   * });
   * @group Periods
   */
  public readPeriodsForEvaluations (): Period[] {
    return this.periodsByOnglet.get(PronoteApiOnglets.Evaluations)!.values.map((period) => period.linkedPeriod)
      .filter(Boolean) as Period[];
  }

  /**
   * Get the current evaluations period.
   * @returns {Period}
   * @example
   * // Get the current evaluations period.
   * period = pronoteInstance.readDefaultPeriodForEvaluations();
   * // Show some informations.
   * console.log("Name:" + period.name);
   * console.log("Starting date:" + period.start.toTimeString());
   * console.log("Ending date:" + period.end.toTimeString());
   * @group Periods
   */
  public readDefaultPeriodForEvaluations (): Period {
    return this.periodsByOnglet.get(PronoteApiOnglets.Evaluations)!.default;
  }

  /**
   * Get evaluations for a specific period.
   * @param {Period=} period
   * Period the grades overview will be from.
   * Default is current period.
   * @returns {Promise<StudentEvaluation[]>}
   * @example
   * //First, we get evaluations for the current period
   * const evaluations = await pronoteInstance.getEvaluations();
   * // Now we can manipulate them.
   * evaluations.forEach((evaluation) => {
   *   console.log(evaluation.name, "::", evaluation.description || "(no description)");
   *
   *   console.group("-> Skills");
   *   evaluation.skills.forEach((skill) => {
   *     console.group(`-> ${skill.item?.name ?? "Unknown skill"}`);
   *     console.log(`${skill.level} : ${skill.abbreviation} (x${skill.coefficient})`);
   *     console.log(`${skill.pillar.name} in the domain of ${skill.domain.name}`);
   *     console.groupEnd();
   *   });
   *   console.groupEnd();
   *   // Line break for next iteration.
   *   console.log();
   * });
   * @group Grades and Evaluations
   */
  public async getEvaluations (period? :Period): Promise<StudentEvaluation[]> {
    if (!(period instanceof Period)) {
      period = this.readDefaultPeriodForGradesOverview()
    }
    return this.queue.push(async () => {
      const { data: { donnees: data } } = await callApiUserEvaluations(this.fetcher, {
        session: this.session,
        period
      });

      return data.listeEvaluations.V
        .map((evaluation) => new StudentEvaluation(evaluation));
    });
  }

  /**
   * Since content inside of it can't change that often,
   * we use a cache to prevent calling the API every time.
   */
  private personalInformationCache?: StudentPersonalInformation;

  /**
   * Allows to get more information such as student's INE, email,
   * phone and address.
   * @param {boolean=} forceUpdate
   * Forces the API request, even if a cache for this request was made.
   * @group User Informations
   */
  public async getPersonalInformation (forceUpdate = false): Promise<StudentPersonalInformation> {
    return this.queue.push(async () => {
      // Use cache when exists and allowed.
      if (this.personalInformationCache && !forceUpdate) return this.personalInformationCache;

      // Otherwise, let's renew the data.
      const { data: { donnees: data } } = await callApiUserPersonalInformation(this.fetcher, {
        session: this.session,
        userID: this.user.ressource.N
      });

      this.personalInformationCache = new StudentPersonalInformation(this.session, data);
      return this.personalInformationCache;
    });
  }

  public getTimetableICalURL (iCalToken: string, fileName = "timetable"): string {
    const version = this.session.instance.version.join(".");
    return `${this.pronoteRootURL}/ical/${fileName}.ics?icalsecurise=${iCalToken}&version=${version}&param=266f3d32`;
  }

  private presenceRequestsInterval?: ReturnType<typeof setInterval>;

  /**
   * Start sending periodic presence request.
   * @param {number=} interval
   * Custom interval (in ms) for `Presence` requests.
   * Defaults to 2 minutes: same value as from Pronote.
   * @returns {void}
   * @group Utils
   */
  public startPresenceRequests (interval?: number): void {
    if (typeof interval !== 'undefined') {
      interval = 2 * 60 * 1000; // Equivalent to 2 min is ms.
    }
    if (this.presenceRequestsInterval) this.stopPresenceRequests();
    this.presenceRequestsInterval = setInterval(() => (
      this.queue.push(() => callApiUserPresence(this.fetcher, { session: this.session }))
    ), interval);
  }

  /**
   * Stop sending periodic presence request.
   * @returns {void}
   * @group Utils
   */
  public stopPresenceRequests (): void {
    if (!this.presenceRequestsInterval) return;
    clearInterval(this.presenceRequestsInterval);
  }

  /**
   * Get the resources associated with the given `lessonId`.
   * @param {string} lessonId - The 
   * @returns {Promise<StudentLessonResource>}
   * @example
   * // Get the timetable of tomorrow
   * tomorrowDate = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
   * overview = await pronoteInstance.getTimetableOverview(tomorrowDate);
   * // 
   * @group Resources
   */
  public async getLessonResource (lessonId: string): Promise<StudentLessonResource> {
    return this.queue.push(async () => {
      const { data: { donnees: data } } = await callApiUserLessonResource(this.fetcher, {
        session: this.session,
        lessonId
      });

      const content = data.ListeCahierDeTextes.V[0];
      return new StudentLessonResource(this, content);
    });
  }

  //TODO: Complete exemple
  /**
   * Get the homework associated with the given `lessonId`.
   * @param {string} lessonId - The 
   * @returns {Promise<StudentLessonResource>}
   * @group Homework
   */
  public async getLessonHomework (lessonId: string): Promise<StudentHomework[]> {
    return this.queue.push(async () => {
      const { data: { donnees: data } } = await callApiUserLessonHomework(this.fetcher, {
        session: this.session,
        lessonId
      });

      return data.ListeCahierDeTextes.V[0].ListeTravailAFaire.V
        .map((homework) => new StudentHomework(this, homework));
    });
  }

  /**
   * Get news such like unread Communication or Discussions.
   * @returns {Promise<StudentNews>}
   * // First we need to get News.
   * const news = await pronote.getNews();
   * // Afterwards let see the differents categories
   * console.group("--- Available categories :");
   *   news.categories.forEach((category) => {
   *   console.log(category.name, category.default ? "(default)" : "");
   * });
   * // Now we show how much news you have.
   * let surveyCount = 0;
   * let informationCount = 0;
   * news.items.forEach((item) => {
   *   if (item instanceof StudentNewsSurvey) {
   *     surveyCount += 1;
   *   } else if (item instanceof StudentNewsInformation){
   *     informationCount += 1;
   *   }
   * });
   * if (surveyCount <= 1){
   *   console.log("You have", surveyCount, "unread survey.");
   * } else {
   *   console.log("You have", surveyCount, "unread surveys.");
   * }
   * if (informationCount <= 1){
   *   console.log("You have", informationCount, "unread information.");
   * } else {
   *   console.log("You have", surveyCount, "unread informations.");
   * }
   * @group News
   */
  public async getNews (): Promise<StudentNews> {
    return this.queue.push(async () => {
      const { data: { donnees: data }} = await callApiUserNews(this.fetcher, { session: this.session });
      return new StudentNews(this, data);
    });
  }

  #throwIfNotAllowedReadMessages (): void {
    if (!this.authorizations.canReadDiscussions) throw new Error("You can't read messages in this instance.");
  }

  #throwIfNotAllowedCreateMessages (): void {
    if (!this.authorizations.canDiscuss) throw new Error("You can't create messages in this instance.");
  }

  /**
   * Obtain a overview of the discussions.
   * @returns {Promise<StudentDiscussionsOverview>}
   * @see
   * {@link StudentDiscussionsOverview} for more details.
   * [manage.ts](https://github.com/LiterateInk/Pawnote/blob/js/examples/discussions/manage.ts)
   * @example
   * // First get the discussions.
   * const discussionsOverview = await pronoteInstance.getDiscussionsOverview();
   * // Then interact with them.
   * for (discussion of discussionsOverview.discussions) {
   *   console.log(discussion.subject);
   *   console.log("In " + discussion.folder.name + "Folder");
   *   if (discussion.deleted){
   *     console.log("The discussion is deleted !");
   *   } else {
   *     discussion.markAsRead();
   *     await discussion.moveToTrash()
   *     await discussion.restoreFromTrash();
   *   }  
   * }
   * @group Discussions
   */
  public async getDiscussionsOverview (): Promise<StudentDiscussionsOverview> {
    return this.queue.push(async () => {
      this.#throwIfNotAllowedReadMessages();

      const { data } = await callApiUserDiscussions(this.fetcher, { session: this.session });
      return new StudentDiscussionsOverview(this, this.queue, this.session, data.donnees);
    });
  }

  /**
   * Obtain a overview of a discussion.
   * @param {StudentDiscussion} discussion 
   * From which discussion to obtain the data?
   * @param {boolean=} markAsRead 
   * The discussion have to be mark as read after fetching?
   * Default: no.
   * @param {number=} [limit = 0]
   * The limit of messages to obtain overview. `0` is no limit.
   * @returns {Promise<MessagesOverview>}
   * @see
   * {@link MessagesOverview} and {@link StudentDiscussion} for more details.
   * @example
   * // Get an overview of available discussions.
   * const discussionsOverview = await pronoteInstance.getDiscussionsOverview();
   * // Select the first discussion available.
   * const firstDiscussion = discussionsOverview.discussions[0];
   * // Get the overview with just of the last message
   * messageOverview = await pronoteInstance.getMessagesOverviewFromDiscussion(firstDiscussion, markAsRead = true, limit = 1);
   * @group Discussions
   */
  public async getMessagesOverviewFromDiscussion (discussion: StudentDiscussion, markAsRead = false, limit = 0): Promise<MessagesOverview> {
    return this.queue.push(async () => {
      this.#throwIfNotAllowedReadMessages();

      const { data } = await callApiUserMessages(this.fetcher, { possessions: discussion.possessions, session: this.session, markAsRead, limit });
      return new MessagesOverview(
        this, this.queue, this.session,
        discussion,
        data
      );
    });
  }

  /**
   * Send a command in a discussion like send to trash or restore from trash.
   * @param {ApiUserDiscussionAvailableCommands} payload 
   * @group Not for normal uses
   */
  public async postDiscussionCommand (payload: ApiUserDiscussionAvailableCommands): Promise<void> {
    await this.queue.push(async () => {
      this.#throwIfNotAllowedCreateMessages();

      await callApiUserDiscussionCommand(this.fetcher, {
        session: this.session,
        ...payload
      });
    });
  }

  /**
   * Mark a discussion as read.
   * @param {StudentDiscussion} discussion
   * Which discussion to mark as read?
   * @remark Shortcut for {@link getMessagesFromDiscussion} but here we don't return anything.
   * @example
   * // Get an overview of available discussions.
   * const discussionsOverview = await pronoteInstance.getDiscussionsOverview();
   * // Select the first discussion available.
   * const firstDiscussion = discussionsOverview.discussions[0];
   * // Now mark the discussion as read.
   * await pronoteInstance.markDiscussionAsRead(firstDiscussion);
   * @group Discussions
   */
  public async markDiscussionAsRead (discussion: StudentDiscussion): Promise<void> {
    await this.getMessagesOverviewFromDiscussion(discussion, true, 0);
  }

  //TODO: Complete exemple
  /**
   * Get message recipients.
   * @param messageID
   * From which message to get the recipients?
   * @returns {Promise<FetchedMessageRecipient[]>}
   * @group Discussions
   */
  public async getRecipientsForMessage (messageID: string): Promise<FetchedMessageRecipient[]> {
    return this.queue.push(async () => {
      this.#throwIfNotAllowedReadMessages();

      const { data } = await callApiUserMessageRecipients(this.fetcher, {
        session: this.session,
        messageID
      });

      return data.donnees.listeDest.V.map((dest) => new FetchedMessageRecipient(dest));
    });
  }

  /**
   * Get the current attendance period.
   * @returns {Period}
   * @example
   * // Get the current attendance period.
   * period = pronoteInstance.readDefaultPeriodForAttendance();
   * // Show some informations.
   * console.log("Name:" + period.name);
   * console.log("Starting date:" + period.start.toTimeString());
   * console.log("Ending date:" + period.end.toTimeString());
   * @group Periods
   */
  public readDefaultPeriodForAttendance (): Period {
    return this.periodsByOnglet.get(PronoteApiOnglets.Attendance)!.default;
  }

  /**
   * Get attendace periods.
   * @returns {Period[]}
   * @example
   * // Get periods for grades.
   * periods = pronoteInstance.readPeriodsForAttendance();
   * // Get the first one.
   * period = periods[0];
   * // Show some informations.
   * console.log("Name:" + period.name);
   * console.log("Starting date:" + period.start.toTimeString());
   * console.log("Ending date:" + period.end.toTimeString());
   * @group Periods
   */
  public readPeriodsForAttendance (): Period[] {
    return this.periodsByOnglet.get(PronoteApiOnglets.Attendance)!.values.map((period) => {
      if (period.linkedPeriod) return period.linkedPeriod;

      // When the period doesn't exist globally, we need
      // to create one that goes from beginning of the year
      // until the end !
      return new Period(this, {
        N: "0", // Not needed.
        periodeNotation: 0, // Unused.

        G: period.genre,
        L: period.name,

        dateDebut: this.loginInformations.donnees.General.PremiereDate,
        dateFin: this.loginInformations.donnees.General.DerniereDate
      });
    });
  }


  /**
   * Get attendances for a sprecific period.
   * @param {Period=} period 
   * Period the attendances will be from. Default is current period.
   * @returns {Promise<(StudentAbsence | StudentDelay  StudentPunishment | StudentObservation)[]>}
   * @example
   * const period = pronoteInstance.readDefaultPeriodForAttendance();
   * // Note that by default, it'll use the default period if you pass no argument.
   * const attendanceOverview = await pronoteInstance.getAttendance(period);
   *
   * for (const attendance of attendanceOverview) {
   *   if (attendance instanceof StudentPrecautionaryMeasure) {
   *     console.log("Mesure Conservatoire:", attendance.circumstances);
   *     console.log(attendance.comments);
   *   }
   * }
   * @group Attendances
   */
  public async getAttendance (period? : Period) {
    if (!(period instanceof Period)) {
      period = this.readDefaultPeriodForAttendance()
    }
    return this.queue.push(async () => {
      const { data } = await callApiUserAttendance(this.fetcher, {
        session: this.session,
        period
      });

      return data.donnees.listeAbsences.V.map((item) => {
        let instance: StudentAbsence | StudentDelay | StudentPunishment | StudentObservation | StudentPrecautionaryMeasure;

        switch (item.G) {
          case PronoteApiResourceType.Absence:
            instance = new StudentAbsence(item);
            break;
          case PronoteApiResourceType.Delay:
            instance = new StudentDelay(item);
            break;
          case PronoteApiResourceType.Punishment:
            instance = new StudentPunishment(this, item);
            break;
          case PronoteApiResourceType.ObservationProfesseurEleve:
            instance = new StudentObservation(item);
            break;
          case PronoteApiResourceType.PrecautionaryMeasure:
            instance = new StudentPrecautionaryMeasure(this, item);
            break;
        }

        return instance;
      }).filter(Boolean) as Array<StudentAbsence | StudentDelay | StudentPunishment | StudentObservation | StudentPrecautionaryMeasure>;
    });
  }

  //TODO: Complete
  /**
   * Updates the status of a news item.
   * Could be a read, or answer to a survey.
   *
   * Should only be used internally, but if you know
   * what you're doing, you can use it.
   * @param {{id: string; title: string, public: PronoteApiNewsPublicSelf}} information
   * @param {StudentNewsItemQuestion[]} answers
   * @param {{delete: boolean; markAsRead: boolean; onlyMarkAsRead: boolean;}=} extra
   * @returns {Promise<undefined>}
   * @group Not for normal uses
   */
  public async patchNewsState (information: {
    id: string
    title: string
    public: PronoteApiNewsPublicSelf
  },
  answers: StudentNewsItemQuestion[],
  extra = {
    delete: false,
    markAsRead: true,
    onlyMarkAsRead: false
  }) {
    return this.queue.push(async () => {
      await callApiUserNewsStatus(this.fetcher, {
        session: this.session,
        id: information.id,
        name: information.title,
        publicSelfData: information.public,
        markAsRead: !extra.delete && extra.markAsRead,
        onlyMarkAsRead: !extra.delete && extra.onlyMarkAsRead,
        delete: !extra.onlyMarkAsRead && extra.delete,
        answers: (extra.onlyMarkAsRead || extra.delete) ? [] : answers
      });

      return void 0;
    });
  }

  #throwIfNotAllowedRecipientType (type: PronoteApiUserResourceType): void {
    switch (type) {
      case PronoteApiResourceType.Teacher:
        if (!this.authorizations.canDiscussWithTeachers)
          throw new Error("You can't discuss with teachers.");
        break;
      case PronoteApiResourceType.Student:
        if (!this.authorizations.canDiscussWithStudents)
          throw new Error("You can't discuss with students.");
        break;
      case PronoteApiResourceType.Personal:
        if (!this.authorizations.canDiscussWithStaff)
          throw new Error("You can't discuss with staff.");
        break;
    }
  }

  /**
   * Returns a list of possible recipients when creating a discussion.
   *
   * This step is required before creating a discussion.
   * It allows to know who can be the recipient of the discussion.
   * @param {PronoteApiUserResourceType} type
   * The desired type of user to search:
   *  - Teacher: PronoteApiResourceType.Teacher
   *  - Student: PronoteApiResourceType.Student
   *  - Personal: PronoteApiResourceType.Personal
   * @returns {Promise<DiscussionCreationRecipient[]>}
   * @example
   * // Imagine, because it's nice to imagine,
   * // that you want to send a message to your favorite teacher
   * // just do this
   * // Verifie if you can send a messages to your teacher.
   * if (!pronoteInstance.authorizations.canDiscussWithTeachers) throw new Error("This account can't discuss, review the permissions.");
   * // Afterwards
   * const teachers = await pronoteInstance.getRecipientsForDiscussionCreation(PronoteApiResourceType.Teacher);
   * // Stock your favorite teacher's name in a variable
   * const myFavoriteTeacherName = "einstein"; // lowercase to ignore case !
   * // Now you want to search your teacher
   * teacher = teachers.filter(teacher => teacher.name.toLowerCase().includes(myFavoriteTeacherName));
   * // We just verify if we have a result
   * if (teacher.length < 1) {
   *   throw new Error('No teacher find with:', myFavoriteTeacherName);
   * }
   * // If there is multiple teacher with the same name, shit, we just get the first one
   * if (teacher.length > 1) {
   *   teacher = teacher.slice(0, 1);
   * }
   * // Now you can send a message !
   * pronoteInstance.createDiscussion(
   *   "I love your courses !",
   *   "The funny thing is that I'm sending this message with Pawnote, you should check it out on github!",
   *   teacher
   * )
   * // Now you're a part of the good side of the force !
   * @group Discussions
   */
  public async getRecipientsForDiscussionCreation (type: PronoteApiUserResourceType): Promise<DiscussionCreationRecipient[]> {
    return this.queue.push(async () => {
      this.#throwIfNotAllowedRecipientType(type);

      const response = await callApiUserCreateDiscussionRecipients(this.fetcher, {
        recipientType: type,
        session: this.session,
        user: {
          type: this.user.ressource.G,
          name: this.user.ressource.L,
          id: this.user.ressource.N
        }
      });

      return response.data.donnees.listeRessourcesPourCommunication.V
        .filter((recipient) => recipient.avecDiscussion)
        .map((r) => new DiscussionCreationRecipient(r));
    });
  }

  /**
   * Creates a discussion.
   *
   * Sadly, we can't get the ID of the created discussion
   * or anything else related to it, you need to request the
   * discussions list once again using `getDiscussionsOverview()`.
   * @param {string} subject
   * The subject for the new Discussion.
   * @param {string} content
   * What is the content of the first message of the new discussion.
   * @param {DiscussionCreationRecipient[]} recipients
   * Who will be in the discussion?
   * @returns  {Promise<void>}
   * @example
   * // Let try to send a message to every students.
   * // First, we need to be sure you can do this!
   * if (!pronoteInstance.authorizations.canDiscussWithStudents) throw new Error("This account can't discuss, review the permissions.");
   * // Now we get all students
   * students = await pronoteInstance.getRecipientsForDiscussionCreation(PronoteApiResourceType.Student)
   * // Now we can create the discussion
   * pronoteInstance.createDiscussion(
   *   "Big announcement!",
   *   "I discovered Pawnote, it's super cool. To see the power of this great tool, take a look at the Papillon app. Both are on GitHub, you have to check it out!",
   *   students
   * )
   * // That's all!
   * @group Discussions
  */
  public async createDiscussion (subject: string, content: string, recipients: DiscussionCreationRecipient[]): Promise<void> {
    return this.queue.push(async () => {
      this.#throwIfNotAllowedCreateMessages();
      if (recipients.length <= 0) throw new Error("You need to select at least one recipient to create a discussion.");

      await callApiUserCreateDiscussion(this.fetcher, {
        session: this.session,
        recipients,
        subject,
        content: {
          isHTML: this.authorizations.hasAdvancedDiscussionEditor,
          value: content
        }
      });
    });
  }

  //TODO: Complete exemple
  /**
   * Send a message in a discussion
   * @param {string} replyMessageID 
   * What message should respond to?
   * You have to reply to a message to send a message.
   * @param {string} content 
   * What is the content of the response?
   * @param {PronoteApiMessagesButtonType} button 
   * What action are you doing?
   * @param {boolean} [includeParentsAndStudents=false] 
   * Have we to include Parents and Students?
   * Default: no (`false`).
   * @returns {Promise<void>}
   * @group Discussions
   */
  public async replyToDiscussionMessage (replyMessageID: string, content: string, button: PronoteApiMessagesButtonType, includeParentsAndStudents = false): Promise<void> {
    return this.queue.push(async () => {
      this.#throwIfNotAllowedCreateMessages();
      const buttonType = getPronoteMessageButtonType(button, includeParentsAndStudents);

      await callApiUserCreateDiscussionMessage(this.fetcher, {
        session: this.session,
        replyMessageID,
        button: buttonType,
        content: {
          isHTML: this.authorizations.hasAdvancedDiscussionEditor,
          value: content
        }
      });
    });
  }

  //TODO: Complete exemple
  /**
   * Upload a file for a homework.
   * @param {string} homeworkID 
   * The ID of the Homework to send file.
   * @param {PawnoteSupportedFormDataFile} file 
   * The file type.
   * @param {string} fileName 
   * The name of the file to upload.
   * @returns {Promise<void>}
   * @see [homework-upload.ts](https://github.com/LiterateInk/Pawnote/blob/js/examples/homework-upload.ts) for more detailled example
   * @example
   * // First! You have to get, by yourself, a homework which can be return with a upload.
   * // After that, let create a fake file.
   * const filename = "mySuperHomeWork.txt";
   * const buffer = Buffer.from(`Hello, world! This file was sent by Pawnote, the ${Date.now()} !`);
   * const blob = new Blob([buffer], {type: "text/plain"})
   * // Now, we upload
   * await homework.uploadFile(blob, filename);
   * // And... that's all for this example
   * @group Homework
   */
  public async uploadHomeworkFile (homeworkID: string, file: PawnoteSupportedFormDataFile, fileName: string): Promise<void> {
    return this.queue.push(async () => {
      // Check if the homework can be uploaded.
      // Otherwise we'll get an error during the upload.
      // @ts-expect-error : trust the process.
      const fileSize: number | undefined = file.size || file.byteLength;
      if (typeof fileSize === "number" && fileSize > this.#authorizations.maxHomeworkFileUploadSize) {
        throw new Error(`File size is too big, maximum allowed is ${this.#authorizations.maxHomeworkFileUploadSize} bytes.`);
      }

      // Ask to the server to store the file for us.
      const payload = this.session.writePronoteFileUploadPayload(file);
      await createPronoteUploadCall(this.fetcher, PronoteApiFunctions.HomeworkUpload, {
        session_instance: this.session.instance,
        fileName: fileName,
        payload
      });

      await callApiUserHomeworkUpload(this.fetcher, {
        fileID: payload.fileID,
        fileName,
        homeworkID,
        session: this.session
      });
    });
  }

  /**
   * Cancel a homework file upload.
   * @param {string} homeworkID
   * The Id of the homework to cancel file upload.
   * @returns {Promise<void>}
   * @example
   * // First! You have to get, by yourself,
   * // a homework which can be return with a upload.
   * // And you whant to remove your return. We can do it!
   * console.log("(return) => file upload", item.return.uploaded ? `(uploaded: ${item.return.uploaded.url})` : "(not uploaded)");
   * // We just check that a file has been uploaded
   * if (item.return.uploaded) {
   *   await item.removeUploadedFile();
   *   console.info("(upload) => successfully removed");
   * }
   * @group Homework
   */
  public async removeHomeworkFile (homeworkID: string): Promise<void> {
    return this.queue.push(async () => {
      await callApiUserHomeworkRemoveUpload(this.fetcher, {
        session: this.session,
        homeworkID
      });
    });
  }

  /**
   * Obtain information from the `PageAcceuil` request.
   * @param {Date} nextOpenDate
   * For what day to get the data
   * By default it is `nextOpenDate`, i.e. the next working day.
   * @returns {Promise<{ard: ARDPartner | null;}>}
   * @remark For the moment, it is just to get ARD widget and TurboSelf link.
   * @example
   * // You can get useful links very easily
   * pronoteInstance.getHomePage().then(homePage => {
   *   homePage.usefulLinks.forEach(link => {
   *     console.log("Name:", link.name);
   *     console.log("Description:", link.description);
   *     console.log("URL:", link.url);
   * });
   * // For ARD widget and TurboSelf link, see getPartnerURL for exemple.
   * @group Utils
   */
  public async getHomePage (nextOpenDate? : Date) {
    if (!(nextOpenDate instanceof Date)) {
      nextOpenDate = this.nextOpenDate
    }
    return this.queue.push(async () => {
      const response = await callApiUserHomepage(this.fetcher, {
        session: this.session,
        nextDateOpened: nextOpenDate,
        weekNumber: translateToPronoteWeekNumber(nextOpenDate, this.firstMonday)
      });

      let ardPartner: Partner | null = null;
      // Is contained in the "lienUtile.listeLiens" array, we need to iterate over it.
      let turboselfPartner: Partner | null = null;

      if (response.data.donnees.partenaireARD) {
        ardPartner = new Partner(this, response.data.donnees.partenaireARD.SSO);
      }

      const usefulLinks: Array<{ name: string, description: string, url: string }> = [];

      for (const link of response.data.donnees.lienUtile.listeLiens.V) {
        if ("SSO" in link) {
          if (link.SSO.codePartenaire === "TURBOSELF") {
            turboselfPartner = new Partner(this, link.SSO);
          }
        }
        else {
          usefulLinks.push({
            name: link.L,
            description: link.commentaire,
            url: link.url
          });
        }
      }

      return {
        usefulLinks,
        ard: ardPartner,
        turboself: turboselfPartner
      };
    });
  }


  /**
   * Get partner URL for different services like ARD or TurboSelf.
   * @param {Partner} partner
   * For which Partner should I obtain the URL?
   * @returns {Promise<string>} URL obtained.
   * @example
   * pronoteInstance.getHomePage().then(homePage => {
   *   if (homePage.ard) { // Do we have ARD?
   *     ardUrl = pronoteInstance.getPartnerURL(homePage.ard)
   *     console.log("ARD URL:", ardUrl);
   *   } 
   *   if (homePage.turboself) { // Do we have TurboSelf?
   *     turboselfUrl = pronoteInstance.getPartnerURL(homePage.turboself)
   *     console.log("Turboself URL:", turboselfUrl);
   *   }
   * });
   * @group Utils
   */
  public async getPartnerURL (partner: Partner): Promise<string> {
    return this.queue.push(async () => {
      const response = await callApiUserPartnerURL(this.fetcher, {
        session: this.session,
        sso: partner.sso
      });

      return response.url;
    });
  }

  /**
   * If a week repeats, we can obtain its frequency.
   * @param {number} weekNumber 
   * @returns {{ type: PronoteApiDomainFrequencyType, name: string } | null}
   * @example
   * // We will take as an example
   * // that you have weeks A and weeks B
   * // If the chosen week is not worked, there will be no return. 
   * week = 5;
   * weekFrequency = pronoteInstance.getFrequencyForWeek(week);
   * if (week == null) {
   *   console.log("Week number", week, "is not repeated or not worked on")
   * } else {
   *   weekName = week.name; // In our case, the output will be A or B.
   *
   *   // This is a number reprensentation of a repeated week.
   *   // It is universal regardless of the instance.
   *   // It could be 1 or 2.
   *   weekGenre = week.type;
   * }
   * @group Timetable
   */
  public getFrequencyForWeek (weekNumber: number): { type: PronoteApiDomainFrequencyType, name: string } | null {
    if (weekNumber < 1) throw new Error("Week number must be at least 1.");
    else if (weekNumber > PronoteApiMaxDomainCycle) throw new Error(`Week number can't be more than maximum value which is ${PronoteApiMaxDomainCycle}.`);

    return this.#weekFrequencies[weekNumber];
  }
}
