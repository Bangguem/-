/* 2: setupActionListeners();
   3: startServer(), socket
   3.1: global variable
   4: 1) stream 구성 2) clientID 수신 3) welcome 메시지 전송
   5: multi client-->thread 적용
   6: class ClientInfo 구현
   6.1: sendMsg, recvMsg 구현
   7: ClientInfo 타입의 객체를 저장하기 위한 Vector 컬렉션 선언 및 관리
   8: 쪽지 보내기
   9: 채팅방 관리
   9.2:JoinRoom
*/
package server;

import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.StringTokenizer;
import java.util.Vector;

import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTextArea;
import javax.swing.JTextField;
import javax.swing.JTextPane;
import javax.swing.border.EmptyBorder;


public class Server10 extends JFrame implements ActionListener {
   private static final long serialVersionUID = 1L;

   // GUI
   private JButton stopBtn;
   private JButton startBtn;
   private JTextField port_tf;
   private JScrollPane scrollPane;
   private JTextArea textArea;

   // 네트워크 변수 3.1
   int port;
   ServerSocket serverSocket;
   Socket clientSocket;
   private String clientID = ""; // 4

   // 8: 수신 메시지 프로토콜 검사
   StringTokenizer st;

   // 7: 기타 변수 관리
   private Vector<ClientInfo> clientVC = new Vector<ClientInfo>(); // 클라이언트 정보 저장 벡터 // 7
   private Vector<RoomInfo> roomVC = new Vector<RoomInfo>(); // 9:

   public Server10() {
      initGUI(); // GUI 초기화 메서드 호출
      setupActionListeners(); // 2

   }

   public void initGUI() {
      setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
      setBounds(100, 100, 330, 350);

      setLayout(null);

      scrollPane = new JScrollPane();
      scrollPane.setBounds(12, 10, 296, 195);
      add(scrollPane);

      textArea = new JTextArea();
      scrollPane.setViewportView(textArea);

      JLabel lblNewLabel = new JLabel("포트 번호");
      lblNewLabel.setBounds(12, 232, 64, 15);

      add(lblNewLabel);

      port_tf = new JTextField();
      port_tf.setBounds(99, 229, 209, 21);
      add(port_tf);
      port_tf.setColumns(10);

      startBtn = new JButton("서버 시작");
      startBtn.setBounds(12, 260, 130, 23);
      add(startBtn);

      stopBtn = new JButton("서버 중지");
      stopBtn.setBounds(178, 260, 130, 23);
      add(stopBtn);

      setVisible(true);
   }

   public void setupActionListeners() { // 2
      startBtn.addActionListener(this);
      stopBtn.addActionListener(this);

   }

   @Override
   public void actionPerformed(ActionEvent e) { // 2
      // TODO Auto-generated method stub
      if (e.getSource() == startBtn) { // 3
         System.out.println("서버 실행");
         startServer(); // ** Start server method call.

      } else if (e.getSource() == stopBtn) {
         System.out.println("서버 중지");
      }
   }

   public void startServer() { // 3
      try {
         port = Integer.parseInt(port_tf.getText().trim());
         serverSocket = new ServerSocket(port);
         textArea.append("서버가 포트 " + port + "에서 시작되었습니다.\n"); // ** Log server start message.
         waitForClientConnection();

      } catch (NumberFormatException e) {
         textArea.append("잘못된 포트 번호입니다.\n"); // ** Log invalid port number error.
      } catch (IOException e) {
         textArea.append("서버 시작 오류: " + e.getMessage() + "\n"); // ** Log server start error.
      }
   }

   // 5.1: thread 적용
   private void waitForClientConnection() {

      // Thread 생성
      Thread th = new Thread(new Runnable() {

         @Override
         public void run() {
            // 6: 여러 클라이언트의 연속적인 접속 요청을 처리
            while (true) { // 6: 무한 loop
               try {
                  textArea.append("클라이언트 Socket 접속 대기중\n");
                  clientSocket = serverSocket.accept(); // 사용자 접속 대기, 무한 대기
                  textArea.append("클라이언트 Socket 접속 완료\n");

                  // 6: ClientInfo 객체 생성
                  ClientInfo client = new ClientInfo(clientSocket);
                  client.start(); // 객체의 스레드 실행

               } catch (IOException e) {
                  e.printStackTrace();
               }
            }
         } // while 끝
      });
      th.start(); // 쓰레드 실행
   }

   // 6: Client 정보 관리
   class ClientInfo extends Thread {
      private DataInputStream dis;
      private DataOutputStream dos;
      private Socket clientSocket;
      private String clientID = "";
      private String roomID = ""; // 9

      ClientInfo(Socket soc) {
         this.clientSocket = soc;
         initNewClient();
      }

      private void initNewClient() {
         try {

            dis = new DataInputStream(clientSocket.getInputStream());
            dos = new DataOutputStream(clientSocket.getOutputStream());
            clientID = dis.readUTF();
            textArea.append("new Client: " + clientID + "\n");

            // 7: 신입 클라이언트 참여
            // 연결되어 있는 클라이언트들에게 신입 가입자 정보 전달
            for (ClientInfo c : clientVC) {
               c.sendMsg("NewClient/" + clientID);
               System.out.println("SEND NewUser " + clientID);
            }

            // 새로 접속한 클라이언트에게 기존 클라이언트 정보 알려줌
            for (ClientInfo c : clientVC) {
               sendMsg("OldClient/" + c.clientID);
            }

            // 9.1: 새로 접속한 클라이언트에게 기존 채팅방 정보 전달
            for (RoomInfo r : roomVC) {
               sendMsg("OldRoom/" + r.roomID);
            }

            // 새로 접속한 클라이언트 등록
            clientVC.add(this);

         } catch (IOException e) {

         }
      }

      // 6.1: sendMsg, recvMsg
      void sendMsg(String msg) {
         try {
            dos.writeUTF(msg);
         } catch (IOException e) {
            textArea.append("메시지 전송 오류: " + e.getMessage() + "\n");
         }
      }

      // 8: 수신한 메시지 프로토콜 처리
      public void parseMsg(String msg) {
         st = new StringTokenizer(msg, "/");
         String protocol = st.nextToken();
         String message = st.nextToken();
         System.out.println("프로토콜 : " + protocol);
         System.out.println("내용 : " + message);
         if (protocol.equals("Note")) {
            String recipientID = message;
            handleNoteProtocol(st, recipientID);
         } else if (protocol.equals("CreateRoom")) {
            String roomID = message;
            handleCreateRoomProtocol(roomID);
         } else if (protocol.equals("JoinRoom")) {
            String roomID = message;
            handleJoinRoomProtocol(roomID);
         } else if (protocol.equals("ChatMsg")) {   //10: 메시지 전송  10.2
            String roomID = message;
            String chatMsg = st.nextToken();
            handleSendMessageProtocol(roomID, chatMsg);
         }
      }

      // 8: 쪽지 처리
      private void handleNoteProtocol(StringTokenizer st, String recipientID) {
         String note = st.nextToken(); // 쪽지 내용

         for (ClientInfo c : clientVC) {
            if (c.clientID.equals(recipientID)) {
               c.sendMsg("Note/" + clientID + "/" + note);
               break;
            }
         }
      }

      // 9: 채팅방 관리 모든 client 들에게 결과 전송
      private void handleCreateRoomProtocol(String roomID) {
         RoomInfo r = new RoomInfo(roomID, this);
         roomVC.add(r);
         this.roomID = roomID;
         for (ClientInfo c : clientVC) {
            c.sendMsg("NewRoom/" + roomID);
         }
      }

      // 9.2: joinRoom 요청 처리
      private void handleJoinRoomProtocol(String roomID) {

         for (RoomInfo r : roomVC) {
            if (r.roomID.equals(roomID)) {
               r.roomClientVC.add(this);   //자신을 채팅방에 등록
               this.roomID = roomID;      //자신의 roomID 설정
               r.broadcast("JoinRoomMsg/" + clientID + "/" + "님이 입장하셨습니다.");
               sendMsg("JoinRoom/" + this.roomID);   //가입 성공을 join 요청 client에게 알림
               break;
            }
         }
      }
      
      // 10: 채팅 메시지 전송
      private void handleSendMessageProtocol(String roomID, String chatMsg) {

         for (RoomInfo r : roomVC) {
            if (r.roomID.equals(roomID)) {
               r.broadcast("ChatMsg/" + clientID  + "/" + chatMsg);  //10.2
               break;
            }
         }
      }

      // Client 로부터 데이터 수신
      public void run() {
         while (true) {

            try {
               String msg = dis.readUTF();
               textArea.append(clientID + "사용자로부터 들어온 메시지 : " + msg + "\n");
               parseMsg(msg); // 8

            } catch (IOException e) {
               // TODO Auto-generated catch block
               e.printStackTrace();
            }
         }
      }
   } // ClientInfo 끝

   // 9: 채팅방 정보 관리
   class RoomInfo {
      private String roomID = "";
      private Vector<ClientInfo> roomClientVC;

      public RoomInfo(String roomID, ClientInfo c) {
         this.roomID = roomID;
         this.roomClientVC = new Vector<ClientInfo>();
         this.roomClientVC.add(c);
      }
      public void broadcast(String msg) {         //9.3 모든 채팅방 가압자에게 메시지 전송
         for(ClientInfo c: roomClientVC) {   //10.3
            c.sendMsg(msg);
         }
      }
   }

   public static void main(String[] args) {
      new Server10();
   }
}