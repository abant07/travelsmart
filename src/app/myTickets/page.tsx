"use client"
import { useRouter } from 'next/navigation';
import React from "react";
import * as algosdk from "algosdk"
import Image from "next/image";
import {PeraWalletConnect} from "@perawallet/connect"

const peraWallet = new PeraWalletConnect();
export default function Profile() {
  const [isConnected, setIsConnected] = React.useState(false);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [showPopup, setShowPopup] = React.useState(false);
  const [inMarket, setShowMarket] = React.useState("");
  const [receiver, setReceiver] = React.useState("");
  const [filter1, setFilter1] = React.useState('');
  const [filter2, setFilter2] = React.useState('');
  const [filter3, setFilter3] = React.useState('');
  const [selectedTicket, setSelectedTicket] = React.useState('');
  const [decodedValues, setDecodedValues] = React.useState([]);
  const [accountAddress, setAccountAddress] = React.useState("");
  const router = useRouter();

  React.useEffect(() => {
    // Reconnect to the session when the component is mounted
    peraWallet.reconnectSession().then((accounts) => {
      peraWallet.connector?.on("disconnect", handleDisconnectWalletClick);
      if (peraWallet.isConnected && accounts.length) {
        setIsConnected(true);
        setAccountAddress(accounts[0])
        getTicketInfo(accounts[0])
      }
    });

    const getTicketInfo = async (account: string) => {
      const algodToken = '';
      const algodServer = 'https://testnet-api.algonode.cloud';
      const algodClient = new algosdk.Algodv2(algodToken, algodServer);
  
      const appId = 679052496;
      const boxesResponse = await algodClient.getApplicationBoxes(appId).do();
      const boxNames = boxesResponse.boxes.map(box => box.name);
      var decode = []
      var allDecodedValues = [];
  
      for (let i = 0; i < boxNames.length; i++) {
        const boxInformation = await algodClient.getApplicationBoxByName(appId, boxNames[i]).do();
        var string = new TextDecoder().decode(boxNames[i]);
        const boxValue = boxInformation.value
        const decodedBoxValue = algosdk.ABIType.from('(string,uint64,uint64,string,uint64,string,string,uint64,string,string,string,address,address,string)').decode(new Uint8Array(Buffer.from(boxValue)))
        
        decode = []
        if (decodedBoxValue[11] == account) {
          decode.push(string)
          decode.push(decodedBoxValue[0])
          decode.push(String(Number(decodedBoxValue[1])))
          decode.push(String(Number(decodedBoxValue[2])))
          decode.push(decodedBoxValue[3])
          decode.push(convertUnixTimestampToString(String(Number(decodedBoxValue[4]))))
          decode.push(decodedBoxValue[5])
          decode.push(decodedBoxValue[6])
          decode.push(convertUnixTimestampToString(String(Number(decodedBoxValue[7]))))
          decode.push(decodedBoxValue[12])
          if (Date.now() > Number(decodedBoxValue[4])) {
            decode.push(decodedBoxValue[13] + " (expired)")
          }
          else {
            decode.push(decodedBoxValue[13])
          }
          console.log(decode)
          allDecodedValues.push(decode);
        }

      }

      setDecodedValues(allDecodedValues);
    }
  }, []);

  const handleConnectClick = () => {
    peraWallet
      .connect()
      .then((newAccounts) => {
        peraWallet.connector?.on("disconnect", handleDisconnectWalletClick);
        setIsConnected(true);
      })
      .catch((error) => {
        setIsConnected(false);
        console.log(error)
      });
  };

  function handleDisconnectWalletClick() {
    peraWallet.disconnect();
    setIsConnected(false);
  }

  const filteredValues = decodedValues.filter(value => 
    String(value[0]).toLowerCase().includes(filter1.toLowerCase()) &&
    String(value[3]).toLowerCase().includes(filter2.toLowerCase()) &&
    String(value[10]).toLowerCase().includes(filter3.toLowerCase())
  );

  function convertUnixTimestampToString(timestampStr: string): string {
    const timestamp = parseInt(timestampStr, 10);
    const date = new Date(timestamp);
    const dateString = `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}T${padNumber(date.getHours())}:${padNumber(date.getMinutes())}:${padNumber(date.getSeconds())}`;

    return dateString;
  }

  function padNumber(num: number): string {
      return num.toString().padStart(2, '0');
  }

  const handleTicketsMouseEnter = () => {
    setShowDropdown(true);
  };

  const handleTicketsMouseLeave = () => {
    setShowDropdown(false);
  };

  const handleClosePopup = () => {
    setShowPopup(false);
  };

  const handleMorePlaneInfo = (receiver: string, status: string) => {
    if (status.includes("expired")) {
      setReceiver(receiver);
      setShowMarket("Ticket NFT departure date has passed");
    }
    else if (status == "created" || status == "bought") {
      setReceiver("No Receiver Yet");
      if (status == "created") {
        setShowMarket("Ticket NFT has been created by you");
      }
      else {
        setShowMarket("Ticket NFT has been bought by you");
      }
    }
    else {
      if (status == "transfer") {
        setReceiver(receiver);
        setShowMarket("Transfer in progress. Waiting for receiver to buy");
      }
      else {
        setReceiver("No Receiver Yet");
        setShowMarket("In market. Waiting for a receiver to buy");
      }
    }
  };

  const handleLogoClick = () => {
    router.push("/");
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <nav className="fixed top-0 left-0 w-full bg-gradient-to-b from-zinc-200 backdrop-blur-2xl dark:bg-zinc-800/30 dark:from-inherit border-b border-gray-300 dark:border-neutral-800 p-4 flex justify-between items-center lg:rounded-xl lg:border lg:bg-gray-200 lg:dark:bg-zinc-800/30">
      <div onClick={handleLogoClick} className="flex items-center text-lg font-bold cursor-pointer">
                <Image
                    src="/logo.svg" // Ensure this path matches your file's location in the public directory
                    alt="TravelSmart Logo"
                    width={50}
                    height={50}
                    onClick={handleLogoClick}
                />
                <span className="ml-2">TravelSmart</span>
                </div>
        {isConnected ? (
          <div className="flex items-center space-x-4">
            <button onClick={() => router.push("/marketplace")} className="px-4 py-2 bg-black text-white rounded hover:bg-white hover:text-black hover:border-black border transition-all">
              Shop Marketplace
            </button>
            <div
              className="relative"
              onMouseEnter={handleTicketsMouseEnter}
            >
              <button onClick={() => router.push("/myTickets")} className="px-4 py-2 bg-black text-white rounded hover:bg-white hover:text-black hover:border-black border transition-all">
                Profile
              </button>
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border dark:border-neutral-800"
                  onMouseLeave={handleTicketsMouseLeave}
                >
                  <a
                    href="/myTickets"
                    className="block px-4 py-2 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-700"
                  >
                    Ticket Status
                  </a>
                  <a
                    href="/ticketsSoldToMe"
                    className="block px-4 py-2 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-700"
                  >
                    Buy My Tickets
                  </a>
                </div>
              )}
            </div>
            <button onClick={handleDisconnectWalletClick} className="px-4 py-2 bg-black text-white rounded hover:bg-white hover:text-black hover:border-black border max-w-xs transition-all truncate">
                {accountAddress}
            </button>
          </div>
        ) : (
          <button
            onClick={handleConnectClick}
            className="px-4 py-2 bg-black text-white rounded hover:bg-white hover:text-black hover:border-black border transition-all"
          >
            Connect Wallet
          </button>
        )}
      </nav>
      <div className="mt-2 text-center">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Your Tickets
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
          View information about tickets you currently own. To buy tickets being sold to you, head over to "Buy My Tickets Page"
        </p>
      </div>
      <div className="mt-4 w-full max-w-lg">
        <input
          type="text"
          placeholder="Filter by Confirmation Code"
          value={filter1}
          onChange={(e) => setFilter1(e.target.value)}
          className="w-full appearance-none px-4 py-2 border rounded-md mt-1 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-neutral-800 dark:focus:ring-neutral-800"
        />
        <input
          type="text"
          placeholder="Filter by Flight Number"
          value={filter2}
          onChange={(e) => setFilter2(e.target.value)}
          className="w-full appearance-none px-4 py-2 border rounded-md mt-1 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-neutral-800 dark:focus:ring-neutral-800"
        />
        <div className="relative">
          <select
            className="w-full appearance-none px-4 py-2 border rounded-md mt-1 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-neutral-800 dark:focus:ring-neutral-800"
            value={filter3}
            onChange={(e) => setFilter3(e.target.value)}
          >
            <option value="">Filter by NFT Ticket Status</option>
            <option value="created">Created</option>
            <option value="bought">Bought</option>
            <option value="transfer">Transfer</option>
            <option value="market">Market</option>
            <option value="expired">Expired</option>
          </select>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-400 dark:text-gray-600 absolute top-1/2 right-3 transform -translate-y-1/2 pointer-events-none"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 12a2 2 0 100-4 2 2 0 000 4z"
              clipRule="evenodd" />
            <path
              fillRule="evenodd"
              d="M4.293 9.293a1 1 0 011.414-1.414L10 12.586l4.293-4.293a1 1 0 111.414 1.414l-5 5a1 1 0 01-1.414 0l-5-5z"
              clipRule="evenodd" />
          </svg>
        </div>
      </div>
      <div className="mb-32 mt-4 grid gap-10 text-center lg:w-full lg:max-w-6xl lg:grid-cols-4 lg:text-left">
        {filteredValues.map((value, index) => (
          <a
            key={index}
            onClick={() => {
              setShowPopup(true)
              setSelectedTicket(value[0])
              handleMorePlaneInfo(value[9], value[10])
            }}
            className="group rounded-lg text-white bg-gradient-to-r from-blue-500 to-purple-600 cursor-pointer border-gray-700 px-5 py-4 transition-colors hover:from-red-400 hover:to-gray-500"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image src="/airplane.svg" alt="Plane" width={64} height={64} className="mx-auto mb-4" />
            <h2 className="mb-3 text-2xl text-center font-semibold">
              {value[0]}
            </h2>
            <p className="m-0 max-w-[30ch] text-center text-sm opacity-50">
              {value[1]} {"| Flight #: "} {value[2]}
            </p>
            <p className="m-0 max-w-[30ch] text-center text-sm opacity-50">
              Status: {String(value[10]).charAt(0).toUpperCase()+ String(value[10]).substring(1).toLowerCase()}
            </p>
          </a>
        ))}
      </div>
      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg p-8 shadow-lg border dark:border-neutral-800 w-full max-w-md mx-4">
            <div className="flex flex-col items-center">
              <Image src="/airplane.svg" alt="Plane" width={64} height={64} className="mb-4" />
              {decodedValues.filter(value => value[0] === selectedTicket).map((value, index) => (
                <div key={index} className="w-full">
                  <h3 className="text-lg text-center font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Ticket Information
                  </h3>
                  <div className="text-gray-700 dark:text-gray-300 mb-4">
                    <p><strong>Airline Name:</strong> {value[1]}</p>
                    <p><strong>Flight Number #:</strong> {value[2]}</p>
                    <p><strong>Ticket Price (ALGO):</strong> {Number(value[3]) / 1000000}</p>
                    <p><strong>Seat Number:</strong> {value[4]}</p>
                    <p><strong>Departure Location:</strong> {value[6]}</p>
                    <p><strong>Arrival Location:</strong> {value[7]}</p>
                    <p><strong>Departure Time:</strong> {value[5]}</p>
                    <p><strong>Arrival Time:</strong> {value[8]}</p>
                    <p className="text-justify max-w-xs truncate"><strong>Receiver:</strong> {receiver}</p>
                    <p><strong>Status:</strong> {inMarket}</p>
                  </div>
                  <button
                    onClick={handleClosePopup}
                    className="mt-4 w-full px-4 py-2 bg-black text-white rounded hover:bg-white hover:text-black hover:border-black border transition-all"
                  >
                    Close
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}